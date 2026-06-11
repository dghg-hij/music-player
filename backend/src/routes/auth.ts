import {
  success,
  error,
  errorResponse,
  parseBody,
  generateUid,
  generateToken,
  hashPassword,
  verifyPassword,
  generateSmsCode,
  corsHeaders,
} from "../utils";

interface Env {
  DB: D1Database;
}

const ACCESS_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const SMS_CODE_TTL_S = 5 * 60; // 5 分钟（秒）
const SMS_RATE_LIMIT_S = 60; // 60 秒

export async function handleAuthRoutes(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const route = segments.join("/");

  switch (route) {
    case "register":
      return handleRegister(request, env);
    case "login/sms":
      return handleLoginSms(request, env);
    case "login":
      return handleLogin(request, env);
    case "sms/send":
      return handleSmsSend(request, env);
    case "password/reset":
      return handlePasswordReset(request, env);
    case "refresh":
      return handleRefresh(request, env);
    case "logout":
      return handleLogout(request, env);
    default:
      return errorResponse(404, "接口不存在");
  }
}

/** POST /api/auth/register — 注册 */
async function handleRegister(request: Request, env: Env): Promise<Response> {
  const { phone, code, password } = await parseBody<{
    phone: string;
    code: string;
    password: string;
  }>(request);

  if (!phone || !code || !password) {
    return errorResponse(400, "缺少必要参数");
  }

  // 验证短信验证码
  const nowS = Math.floor(Date.now() / 1000);
  const smsRecord = await env.DB.prepare(
    "SELECT id, code, expires_at FROM t_sms_code WHERE phone = ? AND type = 'register' ORDER BY created_at DESC LIMIT 1"
  )
    .bind(phone)
    .first<{ id: number; code: string; expires_at: number }>();

  if (!smsRecord) {
    return errorResponse(400, "验证码错误");
  }

  if (smsRecord.code !== code) {
    return errorResponse(400, "验证码错误");
  }

  if (smsRecord.expires_at <= nowS) {
    return errorResponse(400, "验证码已过期，请重新获取");
  }

  // 删除已使用的验证码
  await env.DB.prepare("DELETE FROM t_sms_code WHERE id = ?")
    .bind(smsRecord.id)
    .run();

  // 检查手机号是否已注册
  const existingUser = await env.DB.prepare(
    "SELECT uid FROM t_user WHERE phone = ?"
  )
    .bind(phone)
    .first<{ uid: string }>();

  if (existingUser) {
    return errorResponse(400, "该手机号已注册");
  }

  // 生成用户信息
  const uid = generateUid();
  const account = "user" + uid.slice(-4);
  const nickname = `用户${uid.slice(-4)}`;
  const hashedPwd = await hashPassword(password);
  const nowMs = Date.now();

  // 插入用户
  await env.DB.prepare(
    "INSERT INTO t_user (uid, phone, account, password, nickname, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)"
  )
    .bind(uid, phone, account, hashedPwd, nickname, Math.floor(nowMs / 1000), Math.floor(nowMs / 1000))
    .run();

  // 自动登录：生成 token
  const accessToken = generateToken();
  const refreshToken = generateToken();
  const accessExpiresAt = nowMs + ACCESS_TOKEN_TTL_MS;
  const refreshExpiresAt = nowMs + REFRESH_TOKEN_TTL_MS;

  await env.DB.prepare(
    "INSERT INTO t_token (uid, access_token, refresh_token, access_expires_at, refresh_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(uid, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, Math.floor(nowMs / 1000))
    .run();

  return success({
    uid,
    phone,
    account,
    nickname,
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_MS,
  });
}

/** POST /api/auth/login — 账号密码登录 */
async function handleLogin(request: Request, env: Env): Promise<Response> {
  const { account, password } = await parseBody<{
    account: string;
    password: string;
  }>(request);

  if (!account || !password) {
    return errorResponse(400, "缺少必要参数");
  }

  // 查找用户
  const user = await env.DB.prepare(
    "SELECT uid, phone, account, password, nickname, status FROM t_user WHERE account = ?"
  )
    .bind(account)
    .first<{
      uid: string;
      phone: string;
      account: string;
      password: string;
      nickname: string;
      status: number;
    }>();

  if (!user) {
    return errorResponse(400, "账号或密码错误");
  }

  // 验证密码
  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return errorResponse(400, "账号或密码错误");
  }

  // 检查账号状态
  if (user.status === 0) {
    return errorResponse(403, "账号已被禁用，请联系客服");
  }

  // 生成 token
  const nowMs = Date.now();
  const accessToken = generateToken();
  const refreshToken = generateToken();
  const accessExpiresAt = nowMs + ACCESS_TOKEN_TTL_MS;
  const refreshExpiresAt = nowMs + REFRESH_TOKEN_TTL_MS;

  await env.DB.prepare(
    "INSERT INTO t_token (uid, access_token, refresh_token, access_expires_at, refresh_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(user.uid, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, Math.floor(nowMs / 1000))
    .run();

  return success({
    uid: user.uid,
    phone: user.phone,
    account: user.account,
    nickname: user.nickname,
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_MS,
  });
}

/** POST /api/auth/login/sms — 短信验证码登录 */
async function handleLoginSms(request: Request, env: Env): Promise<Response> {
  const { phone, code } = await parseBody<{ phone: string; code: string }>(
    request
  );

  if (!phone || !code) {
    return errorResponse(400, "缺少必要参数");
  }

  // 验证短信验证码（type 为 login 或 register）
  const nowS = Math.floor(Date.now() / 1000);
  const smsRecord = await env.DB.prepare(
    "SELECT id, code, expires_at FROM t_sms_code WHERE phone = ? AND type IN ('login', 'register') ORDER BY created_at DESC LIMIT 1"
  )
    .bind(phone)
    .first<{ id: number; code: string; expires_at: number }>();

  if (!smsRecord) {
    return errorResponse(400, "验证码错误");
  }

  if (smsRecord.code !== code) {
    return errorResponse(400, "验证码错误");
  }

  if (smsRecord.expires_at <= nowS) {
    return errorResponse(400, "验证码已过期，请重新获取");
  }

  // 删除已使用的验证码
  await env.DB.prepare("DELETE FROM t_sms_code WHERE id = ?")
    .bind(smsRecord.id)
    .run();

  // 查找用户
  const user = await env.DB.prepare(
    "SELECT uid, phone, account, nickname, status FROM t_user WHERE phone = ?"
  )
    .bind(phone)
    .first<{
      uid: string;
      phone: string;
      account: string;
      nickname: string;
      status: number;
    }>();

  if (!user) {
    return errorResponse(400, "该手机号未注册");
  }

  if (user.status === 0) {
    return errorResponse(403, "账号已被禁用，请联系客服");
  }

  // 生成 token
  const nowMs = Date.now();
  const accessToken = generateToken();
  const refreshToken = generateToken();
  const accessExpiresAt = nowMs + ACCESS_TOKEN_TTL_MS;
  const refreshExpiresAt = nowMs + REFRESH_TOKEN_TTL_MS;

  await env.DB.prepare(
    "INSERT INTO t_token (uid, access_token, refresh_token, access_expires_at, refresh_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(user.uid, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, Math.floor(nowMs / 1000))
    .run();

  return success({
    uid: user.uid,
    phone: user.phone,
    account: user.account,
    nickname: user.nickname,
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_MS,
  });
}

/** POST /api/auth/sms/send — 发送短信验证码 */
async function handleSmsSend(request: Request, env: Env): Promise<Response> {
  const { phone, type } = await parseBody<{
    phone: string;
    type: "login" | "register" | "reset";
  }>(request);

  if (!phone || !type) {
    return errorResponse(400, "缺少必要参数");
  }

  // 校验 type
  if (!["login", "register", "reset"].includes(type)) {
    return errorResponse(400, "无效的验证码类型");
  }

  // 校验手机号格式
  if (!/^1\d{10}$/.test(phone)) {
    return errorResponse(400, "请输入正确的手机号");
  }

  // 频率限制：60 秒内不能重复发送
  const nowS = Math.floor(Date.now() / 1000);
  const recentCode = await env.DB.prepare(
    "SELECT id FROM t_sms_code WHERE phone = ? AND type = ? AND created_at > ?"
  )
    .bind(phone, type, nowS - SMS_RATE_LIMIT_S)
    .first<{ id: number }>();

  if (recentCode) {
    return errorResponse(429, "发送过于频繁，请稍后再试");
  }

  // 注册时检查手机号是否已注册
  if (type === "register") {
    const existing = await env.DB.prepare(
      "SELECT uid FROM t_user WHERE phone = ?"
    )
      .bind(phone)
      .first<{ uid: string }>();

    if (existing) {
      return errorResponse(400, "该手机号已注册");
    }
  }

  // 找回密码时检查手机号是否已注册
  if (type === "reset") {
    const existing = await env.DB.prepare(
      "SELECT uid FROM t_user WHERE phone = ?"
    )
      .bind(phone)
      .first<{ uid: string }>();

    if (!existing) {
      return errorResponse(400, "该手机号未注册");
    }
  }

  // 生成验证码
  const code = generateSmsCode();
  const expiresAt = nowS + SMS_CODE_TTL_S;

  await env.DB.prepare(
    "INSERT INTO t_sms_code (phone, code, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(phone, code, type, expiresAt, nowS)
    .run();

  // 模拟短信发送
  console.log(`[SMS] 验证码: ${code} (手机号: ${phone}, 类型: ${type})`);

  return success({ code });
}

/** POST /api/auth/password/reset — 重置密码 */
async function handlePasswordReset(
  request: Request,
  env: Env
): Promise<Response> {
  const { phone, code, newPassword } = await parseBody<{
    phone: string;
    code: string;
    newPassword: string;
  }>(request);

  if (!phone || !code || !newPassword) {
    return errorResponse(400, "缺少必要参数");
  }

  // 验证短信验证码
  const nowS = Math.floor(Date.now() / 1000);
  const smsRecord = await env.DB.prepare(
    "SELECT id, code, expires_at FROM t_sms_code WHERE phone = ? AND type = 'reset' ORDER BY created_at DESC LIMIT 1"
  )
    .bind(phone)
    .first<{ id: number; code: string; expires_at: number }>();

  if (!smsRecord) {
    return errorResponse(400, "验证码错误");
  }

  if (smsRecord.code !== code) {
    return errorResponse(400, "验证码错误");
  }

  if (smsRecord.expires_at <= nowS) {
    return errorResponse(400, "验证码已过期，请重新获取");
  }

  // 删除已使用的验证码
  await env.DB.prepare("DELETE FROM t_sms_code WHERE id = ?")
    .bind(smsRecord.id)
    .run();

  // 更新密码
  const hashedPwd = await hashPassword(newPassword);
  const nowMs = Date.now();

  await env.DB.prepare(
    "UPDATE t_user SET password = ?, updated_at = ? WHERE phone = ?"
  )
    .bind(hashedPwd, Math.floor(nowMs / 1000), phone)
    .run();

  return success(null, "密码重置成功");
}

/** POST /api/auth/refresh — 刷新 token */
async function handleRefresh(request: Request, env: Env): Promise<Response> {
  const { refreshToken } = await parseBody<{ refreshToken: string }>(request);

  if (!refreshToken) {
    return errorResponse(400, "缺少 refreshToken");
  }

  // 查找 token 记录
  const tokenRecord = await env.DB.prepare(
    "SELECT id, uid, refresh_token, refresh_expires_at FROM t_token WHERE refresh_token = ?"
  )
    .bind(refreshToken)
    .first<{
      id: number;
      uid: string;
      refresh_token: string;
      refresh_expires_at: number;
    }>();

  if (!tokenRecord) {
    return errorResponse(401, "无效的刷新令牌");
  }

  // 检查 refresh token 是否过期
  const nowMs = Date.now();
  if (tokenRecord.refresh_expires_at <= nowMs) {
    // 删除过期 token
    await env.DB.prepare("DELETE FROM t_token WHERE id = ?")
      .bind(tokenRecord.id)
      .run();
    return errorResponse(401, "刷新令牌已过期，请重新登录");
  }

  // 生成新 token
  const newAccessToken = generateToken();
  const newRefreshToken = generateToken();
  const accessExpiresAt = nowMs + ACCESS_TOKEN_TTL_MS;
  const refreshExpiresAt = nowMs + REFRESH_TOKEN_TTL_MS;

  // 删除旧 token，插入新 token
  await env.DB.prepare("DELETE FROM t_token WHERE id = ?")
    .bind(tokenRecord.id)
    .run();

  await env.DB.prepare(
    "INSERT INTO t_token (uid, access_token, refresh_token, access_expires_at, refresh_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(
      tokenRecord.uid,
      newAccessToken,
      newRefreshToken,
      accessExpiresAt,
      refreshExpiresAt,
      Math.floor(nowMs / 1000)
    )
    .run();

  return success({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_TTL_MS,
  });
}

/** POST /api/auth/logout — 登出 */
async function handleLogout(request: Request, env: Env): Promise<Response> {
  const body = await parseBody<{ refreshToken?: string }>(request);

  let refreshToken = body.refreshToken;

  // 如果 body 中没有 refreshToken，尝试从 Authorization header 获取
  if (!refreshToken) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const accessToken = authHeader.slice(7);
      // 通过 access_token 查找对应的 refresh_token
      const tokenRecord = await env.DB.prepare(
        "SELECT refresh_token FROM t_token WHERE access_token = ?"
      )
        .bind(accessToken)
        .first<{ refresh_token: string }>();

      if (tokenRecord) {
        refreshToken = tokenRecord.refresh_token;
      }
    }
  }

  if (refreshToken) {
    await env.DB.prepare("DELETE FROM t_token WHERE refresh_token = ?")
      .bind(refreshToken)
      .run();
  }

  return success(null, "登出成功");
}
