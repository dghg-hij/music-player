import { create } from "zustand";
import type { UserInfo, AuthModalView } from "../types";
import { TokenManager, useRemoteApi, apiClient } from "../services/apiClient";

// localStorage keys
const USERS_KEY = "music-player-users";
const TOKEN_KEY = "music-player-token";
const CURRENT_USER_KEY = "music-player-current-user";
const SMS_CODES_KEY = "music-player-sms-codes";

interface StoredUser {
  uid: string;
  phone?: string;
  account?: string;
  password: string;
  nickname: string;
  avatar?: string;
  signature?: string;
  createdAt: number;
  status?: number; // 0禁用 1正常
}

interface SmsCodeRecord {
  code: string;
  phone: string;
  type: "login" | "register" | "reset";
  expiresAt: number;
}

interface AuthStore {
  isLoggedIn: boolean;
  user: UserInfo | null;
  token: string | null;
  tokenExpireTime: number;
  showAuthModal: boolean;
  authModalView: AuthModalView;
  smsCountdown: number;
  showProfileModal: boolean;

  // Actions
  openAuthModal: (view?: AuthModalView) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;

  // 登录
  loginByAccount: (account: string, password: string) => string | null;
  loginByPhone: (phone: string, code: string) => string | null;
  loginBySmsCode: (phone: string, code: string) => string | null;

  // 注册
  register: (phone: string, code: string, password: string) => string | null;

  // 找回密码
  resetPassword: (phone: string, code: string, newPassword: string) => string | null;

  // 登出
  logout: () => void;

  // 验证码
  sendSmsCode: (phone: string, type: "login" | "register" | "reset") => string | null;
  startSmsCountdown: () => void;

  // 个人资料修改 - PRD 3.5.5
  updateProfile: (patch: { nickname?: string; avatar?: string; signature?: string }) => string | null;
  changePassword: (oldPassword: string, newPassword: string) => string | null;

  // 初始化
  initAuth: () => void;

  // PRD 6.3：Token 过期自动 Refresh
  refreshToken: () => void;
}

function generateUid(): string {
  return String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function generateToken(): string {
  return "token_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
}

function generateSmsCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSmsCodes(): SmsCodeRecord[] {
  try {
    const raw = localStorage.getItem(SMS_CODES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSmsCodes(codes: SmsCodeRecord[]) {
  localStorage.setItem(SMS_CODES_KEY, JSON.stringify(codes));
}

let smsTimer: ReturnType<typeof setInterval> | null = null;

const useAuthStore = create<AuthStore>((set, get) => ({
  isLoggedIn: false,
  user: null,
  token: null,
  tokenExpireTime: 0,
  showAuthModal: false,
  authModalView: "login",
  smsCountdown: 0,
  showProfileModal: false,

  openAuthModal: (view = "login") => {
    set({ showAuthModal: true, authModalView: view });
  },
  closeAuthModal: () => {
    set({ showAuthModal: false, authModalView: "login" });
  },
  setAuthModalView: (view) => set({ authModalView: view }),
  openProfileModal: () => {
    if (get().isLoggedIn) set({ showProfileModal: true });
    else set({ showAuthModal: true, authModalView: "login" });
  },
  closeProfileModal: () => set({ showProfileModal: false }),

  loginByAccount: (account, password) => {
    // Remote API 模式
    if (useRemoteApi()) {
      (async () => {
        try {
          const res = await apiClient.post<{
            uid: string; phone?: string; account?: string;
            nickname: string; avatar?: string; signature?: string;
            accessToken: string; refreshToken: string; expiresIn: number;
          }>("/auth/login", { account, password });
          if (res.code !== 200) {
            window.dispatchEvent(new CustomEvent("auth:login-error", { detail: { message: res.message } }));
            return;
          }
          const d = res.data;
          const userInfo: UserInfo = { uid: d.uid, phone: d.phone, account: d.account, nickname: d.nickname, avatar: d.avatar, signature: d.signature };
          TokenManager.setAccessToken(d.accessToken, d.expiresIn);
          TokenManager.setRefreshToken(d.refreshToken);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
          set({ isLoggedIn: true, user: userInfo, token: d.accessToken, tokenExpireTime: Date.now() + d.expiresIn, showAuthModal: false });
          window.dispatchEvent(new CustomEvent("auth:login"));
        } catch (e: any) {
          window.dispatchEvent(new CustomEvent("auth:login-error", { detail: { message: e.message || "登录失败" } }));
        }
      })();
      return null;
    }

    // Mock 模式
    const users = getStoredUsers();
    const user = users.find(
      (u) => u.account === account && u.password === password
    );
    if (!user) return "账号或密码错误";

    // PRD 6.3：账号被禁用提示
    if (user.status === 0) return "账号已被禁用，请联系客服";

    const token = generateToken();
    const userInfo: UserInfo = {
      uid: user.uid,
      phone: user.phone,
      account: user.account,
      nickname: user.nickname,
      avatar: user.avatar,
      signature: user.signature,
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("music-player-token-time", String(Date.now()));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
    // PRD 4.2：同步 Token 到 apiClient 的 TokenManager，确保远程 API 请求携带 Authorization
    TokenManager.setAccessToken(token, 7 * 24 * 60 * 60 * 1000);
    TokenManager.setRefreshToken(token);
    set({ isLoggedIn: true, user: userInfo, token, tokenExpireTime: Date.now() + 7 * 24 * 60 * 60 * 1000, showAuthModal: false });
    // PRD 评审纪要 C1：登录成功后派发事件，触发数据拉取
    window.dispatchEvent(new CustomEvent("auth:login"));
    return null;
  },

  loginByPhone: (phone, code) => {
    // Remote API 模式
    if (useRemoteApi()) {
      (async () => {
        try {
          const res = await apiClient.post<{
            uid: string; phone?: string; account?: string;
            nickname: string; accessToken: string; refreshToken: string; expiresIn: number;
            avatar?: string; signature?: string;
          }>("/auth/login/sms", { phone, code });
          if (res.code !== 200) {
            window.dispatchEvent(new CustomEvent("auth:login-error", { detail: { message: res.message } }));
            return;
          }
          const d = res.data;
          const userInfo: UserInfo = { uid: d.uid, phone: d.phone, account: d.account, nickname: d.nickname, avatar: d.avatar, signature: d.signature };
          TokenManager.setAccessToken(d.accessToken, d.expiresIn);
          TokenManager.setRefreshToken(d.refreshToken);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
          set({ isLoggedIn: true, user: userInfo, token: d.accessToken, tokenExpireTime: Date.now() + d.expiresIn, showAuthModal: false });
          window.dispatchEvent(new CustomEvent("auth:login"));
        } catch (e: any) {
          window.dispatchEvent(new CustomEvent("auth:login-error", { detail: { message: e.message || "登录失败" } }));
        }
      })();
      return null;
    }

    // Mock 模式
    // PRD 6.3：区分验证码错误与过期
    const allCodes = getSmsCodes();
    const phoneCodes = allCodes.filter((c) => c.phone === phone && (c.type === "login" || c.type === "register"));
    const exactMatch = phoneCodes.find((c) => c.code === code);

    if (!exactMatch) {
      // 检查是否有已过期的匹配验证码
      const expiredMatch = phoneCodes.find(
        (c) => c.code === code && c.expiresAt <= Date.now()
      );
      if (expiredMatch) {
        return "验证码已过期，请重新获取";
      }
      return "验证码错误";
    }
    if (exactMatch.expiresAt <= Date.now()) {
      return "验证码已过期，请重新获取";
    }

    const users = getStoredUsers();
    const user = users.find((u) => u.phone === phone);
    if (!user) return "该手机号未注册";
    // PRD 6.3：账号被禁用
    if (user.status === 0) return "账号已被禁用，请联系客服";

    const token = generateToken();
    const userInfo: UserInfo = {
      uid: user.uid,
      phone: user.phone,
      account: user.account,
      nickname: user.nickname,
      avatar: user.avatar,
      signature: user.signature,
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("music-player-token-time", String(Date.now()));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
    // PRD 4.2：同步 Token 到 apiClient 的 TokenManager
    TokenManager.setAccessToken(token, 7 * 24 * 60 * 60 * 1000);
    TokenManager.setRefreshToken(token);
    set({ isLoggedIn: true, user: userInfo, token, tokenExpireTime: Date.now() + 7 * 24 * 60 * 60 * 1000, showAuthModal: false });
    // PRD 评审纪要 C1：登录成功后派发事件，触发数据拉取
    window.dispatchEvent(new CustomEvent("auth:login"));
    return null;
  },

  loginBySmsCode: (phone, code) => {
    return get().loginByPhone(phone, code);
  },

  register: (phone, code, password) => {
    // Remote API 模式
    if (useRemoteApi()) {
      (async () => {
        try {
          const res = await apiClient.post<{
            uid: string; phone?: string; account?: string;
            nickname: string; accessToken: string; refreshToken: string; expiresIn: number;
          }>("/auth/register", { phone, code, password });
          if (res.code !== 200) {
            window.dispatchEvent(new CustomEvent("auth:register-error", { detail: { message: res.message } }));
            return;
          }
          const d = res.data;
          const userInfo: UserInfo = { uid: d.uid, phone: d.phone, account: d.account, nickname: d.nickname };
          TokenManager.setAccessToken(d.accessToken, d.expiresIn);
          TokenManager.setRefreshToken(d.refreshToken);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
          set({ isLoggedIn: true, user: userInfo, token: d.accessToken, tokenExpireTime: Date.now() + d.expiresIn, showAuthModal: false });
          window.dispatchEvent(new CustomEvent("auth:login"));
          window.dispatchEvent(new CustomEvent("auth:register-success", { detail: { account: d.account } }));
        } catch (e: any) {
          window.dispatchEvent(new CustomEvent("auth:register-error", { detail: { message: e.message || "注册失败" } }));
        }
      })();
      return null;
    }

    // Mock 模式
    const allCodes = getSmsCodes();
    const phoneCodes = allCodes.filter((c) => c.phone === phone && c.type === "register");
    const exactMatch = phoneCodes.find((c) => c.code === code);

    if (!exactMatch) {
      const expiredMatch = phoneCodes.find(
        (c) => c.code === code && c.expiresAt <= Date.now()
      );
      if (expiredMatch) {
        return "验证码已过期，请重新获取";
      }
      return "验证码错误";
    }
    if (exactMatch.expiresAt <= Date.now()) {
      return "验证码已过期，请重新获取";
    }

    const users = getStoredUsers();
    if (users.some((u) => u.phone === phone)) return "该手机号已注册";

    const uid = generateUid();
    const account = "user" + uid.slice(-4);
    const newUser: StoredUser = {
      uid,
      phone,
      account,
      password,
      nickname: `用户${uid.slice(-4)}`,
      createdAt: Date.now(),
      status: 1,
    };

    saveStoredUsers([...users, newUser]);

    // 自动登录
    const token = generateToken();
    const userInfo: UserInfo = {
      uid: newUser.uid,
      phone: newUser.phone,
      account: newUser.account,
      nickname: newUser.nickname,
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("music-player-token-time", String(Date.now()));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
    // PRD 4.2：同步 Token 到 apiClient 的 TokenManager
    TokenManager.setAccessToken(token, 7 * 24 * 60 * 60 * 1000);
    TokenManager.setRefreshToken(token);
    set({ isLoggedIn: true, user: userInfo, token, tokenExpireTime: Date.now() + 7 * 24 * 60 * 60 * 1000, showAuthModal: false });
    // PRD 评审纪要 C1：注册成功（自动登录）后派发事件，触发数据拉取
    window.dispatchEvent(new CustomEvent("auth:login"));
    // 通知 UI 层显示账号信息（方便用户下次用账号密码登录）
    window.dispatchEvent(new CustomEvent("auth:register-success", { detail: { account } }));
    return null;
  },

  resetPassword: (phone, code, newPassword) => {
    // Remote API 模式
    if (useRemoteApi()) {
      (async () => {
        try {
          const res = await apiClient.post<null>("/auth/password/reset", { phone, code, newPassword });
          if (res.code !== 200) {
            window.dispatchEvent(new CustomEvent("auth:reset-error", { detail: { message: res.message } }));
            return;
          }
          set({ authModalView: "login" });
        } catch (e: any) {
          window.dispatchEvent(new CustomEvent("auth:reset-error", { detail: { message: e.message || "重置失败" } }));
        }
      })();
      return null;
    }

    // Mock 模式
    // PRD 6.3：区分验证码错误与过期
    const allCodes = getSmsCodes();
    const phoneCodes = allCodes.filter((c) => c.phone === phone && c.type === "reset");
    const exactMatch = phoneCodes.find((c) => c.code === code);

    if (!exactMatch) {
      const expiredMatch = phoneCodes.find(
        (c) => c.code === code && c.expiresAt <= Date.now()
      );
      if (expiredMatch) {
        return "验证码已过期，请重新获取";
      }
      return "验证码错误";
    }
    if (exactMatch.expiresAt <= Date.now()) {
      return "验证码已过期，请重新获取";
    }

    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.phone === phone);
    if (idx === -1) return "该手机号未注册";

    users[idx] = { ...users[idx], password: newPassword };
    saveStoredUsers(users);
    set({ authModalView: "login" });
    return null;
  },

  logout: () => {
    // Remote API 模式：通知后端删除 token
    if (useRemoteApi()) {
      const refreshToken = TokenManager.getRefreshToken();
      if (refreshToken) {
        apiClient.post("/auth/logout", { refreshToken }).catch(() => {});
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    // PRD 4.2：同步清除 apiClient 的 TokenManager
    TokenManager.clearAll();
    set({ isLoggedIn: false, user: null, token: null });
  },

  sendSmsCode: (phone, type) => {
    // Remote API 模式
    if (useRemoteApi()) {
      (async () => {
        try {
          const res = await apiClient.post<{ code: string }>("/auth/sms/send", { phone, type });
          if (res.code !== 200) {
            window.dispatchEvent(new CustomEvent("auth:sms-error", { detail: { message: res.message } }));
            return;
          }
          get().startSmsCountdown();
          window.dispatchEvent(new CustomEvent("auth:sms-code", { detail: { code: res.data.code, phone, type } }));
        } catch (e: any) {
          window.dispatchEvent(new CustomEvent("auth:sms-error", { detail: { message: e.message || "发送失败" } }));
        }
      })();
      return null;
    }

    // Mock 模式
    if (!/^1\d{10}$/.test(phone)) return "请输入正确的手机号";

    // 先清理已过期的验证码记录
    const allCodes = getSmsCodes();
    const validCodes = allCodes.filter((c) => c.expiresAt > Date.now());
    if (validCodes.length < allCodes.length) {
      saveSmsCodes(validCodes);
    }

    // 注册时检查手机号是否已注册
    if (type === "register") {
      const users = getStoredUsers();
      if (users.some((u) => u.phone === phone)) return "该手机号已注册";
    }

    // 找回密码时检查手机号是否存在
    if (type === "reset") {
      const users = getStoredUsers();
      if (!users.some((u) => u.phone === phone)) return "该手机号未注册";
    }

    // 频率限制：60秒内不能重复发送
    // expiresAt = createdAt + 5*60*1000，所以 createdAt = expiresAt - 300000
    const codes = getSmsCodes();
    const recent = codes.find(
      (c) => c.phone === phone && (c.expiresAt - 5 * 60 * 1000) > Date.now() - 60000
    );
    if (recent) return "发送过于频繁，请稍后再试";

    const code = generateSmsCode();
    const record: SmsCodeRecord = {
      code,
      phone,
      type,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5分钟有效
    };

    saveSmsCodes([...codes.filter((c) => c.expiresAt > Date.now()), record]);
    get().startSmsCountdown();

    // 将验证码显示在控制台（模拟短信发送）
    console.log(`[SMS] 验证码: ${code} (手机号: ${phone}, 类型: ${type})`);
    // 同时通过自定义事件通知 UI 层显示验证码（模拟短信）
    window.dispatchEvent(new CustomEvent("auth:sms-code", { detail: { code, phone, type } }));
    return null;
  },

  startSmsCountdown: () => {
    if (smsTimer) clearInterval(smsTimer);
    set({ smsCountdown: 60 });
    smsTimer = setInterval(() => {
      const { smsCountdown } = get();
      if (smsCountdown <= 1) {
        set({ smsCountdown: 0 });
        if (smsTimer) {
          clearInterval(smsTimer);
          smsTimer = null;
        }
      } else {
        set({ smsCountdown: smsCountdown - 1 });
      }
    }, 1000);
  },

  // 个人资料修改 - PRD 3.5.5
  updateProfile: (patch) => {
    const { user, isLoggedIn } = get();
    if (!isLoggedIn || !user) return "请先登录";

    // Remote API 模式
    if (useRemoteApi()) {
      (async () => {
        try {
          const res = await apiClient.put<UserInfo>("/user/profile", patch);
          if (res.code === 200 && res.data) {
            const next: UserInfo = res.data;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(next));
            set({ user: next });
          }
        } catch { /* ignore */ }
      })();
      return null;
    }

    // Mock 模式

    // 字段校验
    if (patch.nickname !== undefined) {
      const n = patch.nickname.trim();
      if (n.length < 2 || n.length > 20) return "昵称需为 2-20 字";
      patch = { ...patch, nickname: n };
    }
    if (patch.signature !== undefined) {
      if (patch.signature.length > 100) return "签名最多 100 字";
    }
    if (patch.avatar !== undefined) {
      if (patch.avatar && !/^(data:image\/[a-zA-Z]+;base64,|https?:\/\/)/.test(patch.avatar)) {
        return "头像格式不正确";
      }
    }

    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.uid === user.uid);
    if (idx === -1) return "账号不存在";

    // 写入持久化存储
    const updated: StoredUser = { ...users[idx] };
    if (patch.nickname !== undefined) updated.nickname = patch.nickname;
    if (patch.avatar !== undefined) updated.avatar = patch.avatar;
    if (patch.signature !== undefined) updated.signature = patch.signature;
    users[idx] = updated;
    saveStoredUsers(users);

    // 更新内存
    const next: UserInfo = {
      ...user,
      nickname: patch.nickname !== undefined ? patch.nickname : user.nickname,
      avatar: patch.avatar !== undefined ? patch.avatar : user.avatar,
      signature: patch.signature !== undefined ? patch.signature : user.signature,
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(next));
    set({ user: next });
    return null;
  },

  changePassword: (oldPassword, newPassword) => {
    const { user, isLoggedIn } = get();
    if (!isLoggedIn || !user) return "请先登录";

    // Remote API 模式
    if (useRemoteApi()) {
      (async () => {
        try {
          const res = await apiClient.put<null>("/user/password", { oldPassword, newPassword });
          if (res.code !== 200) {
            window.dispatchEvent(new CustomEvent("auth:password-error", { detail: { message: res.message } }));
          }
        } catch (e: any) {
          window.dispatchEvent(new CustomEvent("auth:password-error", { detail: { message: e.message || "修改失败" } }));
        }
      })();
      return null;
    }

    // Mock 模式
    if (!/^[a-zA-Z0-9]{8,16}$/.test(newPassword)) return "新密码需 8-16 位字母数字组合";

    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.uid === user.uid);
    if (idx === -1) return "账号不存在";
    if (users[idx].password !== oldPassword) return "原密码错误";

    users[idx] = { ...users[idx], password: newPassword };
    saveStoredUsers(users);
    return null;
  },

  initAuth: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      const tokenTimeKey = "music-player-token-time";
      const tokenTimeRaw = localStorage.getItem(tokenTimeKey);

      if (token && raw) {
        const user: UserInfo = JSON.parse(raw);

        // PRD 6.3：Token 过期检测（模拟 7 天有效期）
        const TOKEN_VALID_MS = 7 * 24 * 60 * 60 * 1000;
        const tokenTime = tokenTimeRaw ? parseInt(tokenTimeRaw, 10) : 0;
        const isExpired = Date.now() - tokenTime > TOKEN_VALID_MS;

        if (isExpired) {
          // PRD 6.3：Token 过期 → 自动尝试 Refresh Token（30天），失败则跳转登录
          const REFRESH_TOKEN_VALID_MS = 30 * 24 * 60 * 60 * 1000;
          const isRefreshExpired = Date.now() - tokenTime > REFRESH_TOKEN_VALID_MS;

          if (!isRefreshExpired) {
            // Refresh Token 仍有效，自动续签
            const newToken = generateToken();
            localStorage.setItem(TOKEN_KEY, newToken);
            localStorage.setItem(tokenTimeKey, String(Date.now()));
            // PRD 4.2：同步续签 Token 到 apiClient 的 TokenManager
            TokenManager.setAccessToken(newToken, TOKEN_VALID_MS);
            TokenManager.setRefreshToken(newToken);
            set({ isLoggedIn: true, user, token: newToken, tokenExpireTime: Date.now() + TOKEN_VALID_MS });
          } else {
            // Refresh Token 也过期，清除登录状态
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(CURRENT_USER_KEY);
            localStorage.removeItem(tokenTimeKey);
            TokenManager.clearAll();
            set({ isLoggedIn: false, user: null, token: null });
          }
        } else {
          // PRD 4.2：恢复 Token 到 apiClient 的 TokenManager
          TokenManager.setAccessToken(token, TOKEN_VALID_MS - (Date.now() - tokenTime));
          TokenManager.setRefreshToken(token);
          set({ isLoggedIn: true, user, token, tokenExpireTime: tokenTime + TOKEN_VALID_MS });
        }
      }
    } catch {
      // Token 无效，忽略
    }
  },

  refreshToken: () => {
    const { isLoggedIn, user } = get();
    if (!isLoggedIn || !user) return;

    const newToken = generateToken();
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem("music-player-token-time", String(Date.now()));
    // PRD 4.2：同步刷新 Token 到 apiClient 的 TokenManager
    TokenManager.setAccessToken(newToken, 7 * 24 * 60 * 60 * 1000);
    TokenManager.setRefreshToken(newToken);
    set({ token: newToken, tokenExpireTime: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  },
}));

export default useAuthStore;
