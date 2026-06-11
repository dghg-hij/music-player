// ============================================================
// 模块11 - 缓存策略
// 缓存中间件：为路由提供缓存能力
// ============================================================

import { CacheService } from "./service";
import { CACHE_RULES } from "./config";

/**
 * 缓存中间件 — 仅对 GET 请求生效
 *
 * 使用方式（在路由处理函数中）：
 *   const cached = await cacheMiddleware(cache, request, "SONG_DETAIL", String(songId));
 *   if (cached) return cached;
 *   // ... 执行数据库查询 ...
 *   await cache.set("SONG_DETAIL", String(songId), data);
 *   return success(data);
 */
export async function cacheMiddleware(
  cache: CacheService,
  request: Request,
  configName: string,
  suffix?: string
): Promise<Response | null> {
  // 仅 GET 请求使用缓存
  if (CACHE_RULES.onlyGetRequests && request.method !== "GET") {
    return null;
  }

  const data = await cache.get(configName, suffix);
  if (data === null) return null;

  // 缓存命中，返回响应
  return new Response(JSON.stringify({
    code: 200,
    message: "请求成功",
    data,
    timestamp: Date.now(),
  }), {
    headers: {
      "Content-Type": "application/json",
      "X-Cache": "HIT",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * 缓存写入包装器 — 仅在请求成功时写入缓存
 *
 * 使用方式：
 *   return await cacheWrite(cache, "SONG_DETAIL", String(songId), response);
 */
export async function cacheWrite(
  cache: CacheService,
  configName: string,
  suffix: string | undefined,
  response: Response
): Promise<void> {
  // 仅在请求成功时写入缓存
  if (!CACHE_RULES.writeOnSuccessOnly) {
    return;
  }

  try {
    const body = await response.clone().json() as { code: number; data: unknown };
    if (body.code === 200 && body.data !== null) {
      await cache.set(configName, suffix, body.data);
    }
  } catch {
    // 缓存写入失败不影响主流程
  }
}
