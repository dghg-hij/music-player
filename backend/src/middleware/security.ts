// ============================================================
// 安全中间件整合（模块 12：安全与权限）
// 整合认证、限流、权限控制、CORS、日志等安全机制
// 对应文档 12.1-12.6 全部安全规范
// ============================================================

import { corsHeaders, authenticate } from "../utils";
import {
  rateLimit,
  getRateLimitPolicy,
  buildRateLimitKey,
} from "./rateLimit";
import {
  logApiAccess,
  logError,
  generateRequestId,
  getClientIp,
  D1LogWriter,
  CompositeLogWriter,
  ConsoleLogWriter,
  setLogWriters,
} from "./logger";

export interface Env {
  DB: D1Database;
  CACHE?: KVNamespace; // 缓存 KV 命名空间（模块11）
  ENVIRONMENT?: string; // development | production
}

/** 安全上下文，传递给路由处理器 */
export interface SecurityContext {
  requestId: string;
  uid: string | null;
  ip: string;
  env: Env;
}

/**
 * 初始化日志系统
 * 根据环境变量选择日志写入器
 */
export function initLogger(env: Env): void {
  const writers = [new ConsoleLogWriter()];

  // 生产环境额外写入 D1
  if (env.DB && env.ENVIRONMENT === "production") {
    writers.push(new D1LogWriter(env.DB));
  }

  setLogWriters(writers);
}

/**
 * 安全中间件主函数
 * 按顺序执行：CORS → 限流 → 认证 → 请求处理 → 日志
 *
 * @returns 处理后的 Response，或 null 表示通过（由路由处理器继续处理）
 */
export async function securityMiddleware(
  request: Request,
  env: Env
): Promise<{ response: Response | null; ctx: SecurityContext }> {
  const requestId = generateRequestId();
  const ip = getClientIp(request);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const startTime = Date.now();

  const ctx: SecurityContext = {
    requestId,
    uid: null,
    ip,
    env,
  };

  // ---- 12.6 CORS 预检 ----
  if (method === "OPTIONS") {
    return {
      response: new Response(null, { status: 204, headers: corsHeaders }),
      ctx,
    };
  }

  // ---- 12.4 接口限流 ----
  const policy = getRateLimitPolicy(path);
  const rateLimitKey = buildRateLimitKey(request, null);
  const limitResult = rateLimit(rateLimitKey, policy);

  if (!limitResult.allowed) {
    const response = Response.json(
      {
        code: 429,
        message: "请求过于频繁，请稍后再试",
        data: null,
        timestamp: Date.now(),
      },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Retry-After": String(Math.ceil((limitResult.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(limitResult.resetAt / 1000)),
        },
      }
    );

    // 记录限流日志
    await logApiAccess({
      requestId,
      ip,
      method,
      path,
      statusCode: 429,
      duration: Date.now() - startTime,
    });

    return { response, ctx };
  }

  // ---- 12.1 认证（尝试提取 UID，不强制） ----
  const uid = await authenticate(request, env.DB);
  ctx.uid = uid;

  // 在响应头中附加限流信息
  return { response: null, ctx };
}

/**
 * 创建带安全头的响应
 * 添加安全相关 HTTP 头
 */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  // 安全头
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 限流信息
  headers.set("X-RateLimit-Remaining", ""); // 由限流中间件填充

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * 请求后处理：记录访问日志
 */
export async function afterRequest(
  ctx: SecurityContext,
  request: Request,
  statusCode: number,
  duration: number
): Promise<void> {
  const url = new URL(request.url);
  await logApiAccess({
    requestId: ctx.requestId,
    uid: ctx.uid ?? undefined,
    ip: ctx.ip,
    method: request.method,
    path: url.pathname,
    statusCode,
    duration,
  });
}

/**
 * 错误处理：记录错误日志
 */
export async function onError(
  ctx: SecurityContext,
  request: Request,
  error: unknown
): Promise<void> {
  const url = new URL(request.url);
  const message = error instanceof Error ? error.message : "未知错误";
  const stack = error instanceof Error ? error.stack : undefined;

  await logError({
    requestId: ctx.requestId,
    uid: ctx.uid ?? undefined,
    message,
    stack,
    path: url.pathname,
    method: request.method,
  });
}
