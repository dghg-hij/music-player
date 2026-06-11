// ============================================================
// 音乐播放器后端 - Cloudflare Worker 入口
// 集成安全中间件（模块 12：安全与权限）
// 集成缓存模块（模块 11：缓存策略）
// ============================================================

import { error, errorResponse, authenticate, corsHeaders } from "./utils";
import { handleAuthRoutes } from "./routes/auth";
import { handleUserRoutes } from "./routes/user";
import { handlePlaylistRoutes } from "./routes/playlist";
import { handleSongRoutes } from "./routes/song";
import { handleMemberRoutes } from "./routes/member";
import { handleFeedbackRoutes } from "./routes/feedback";
import {
  securityMiddleware,
  afterRequest,
  onError,
  initLogger,
  type Env,
  type SecurityContext,
} from "./middleware/security";
import { CacheService, KvCacheStore, MemoryCacheStore } from "./cache";
import { initDatabase } from "./db";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/** 创建缓存服务实例 */
function createCacheService(env: Env): CacheService {
  if (env.CACHE) {
    return new CacheService(new KvCacheStore(env.CACHE));
  }
  // 本地开发降级为内存缓存
  return new CacheService(new MemoryCacheStore());
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();

    // 初始化日志系统
    initLogger(env);

    // 初始化缓存服务
    const cache = createCacheService(env);

    // 执行安全中间件（CORS、限流、认证尝试）
    const { response: securityResponse, ctx } = await securityMiddleware(request, env);

    // 中间件拦截（如 CORS 预检、限流拒绝），直接返回
    if (securityResponse) {
      return securityResponse;
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      let response: Response;

      // /api/auth/* — 认证路由（无需鉴权）
      if (path.startsWith("/api/auth/")) {
        const segments = path.replace("/api/auth/", "").split("/").filter(Boolean);
        response = await handleAuthRoutes(request, env, segments);
      }
      // /api/song/* — 歌曲路由（部分公开，部分需鉴权，鉴权在路由内部处理）
      else if (path.startsWith("/api/song/")) {
        const segments = path.replace("/api/song/", "").split("/").filter(Boolean);
        response = await handleSongRoutes(request, env, segments);
      }
      // 以下路由均需鉴权
      else if (ctx.uid) {
        if (path.startsWith("/api/user/")) {
          const segments = path.replace("/api/user/", "").split("/").filter(Boolean);
          response = await handleUserRoutes(request, env, segments);
        } else if (path.startsWith("/api/playlist/")) {
          const segments = path.replace("/api/playlist/", "").split("/").filter(Boolean);
          response = await handlePlaylistRoutes(request, env, segments);
        } else if (path.startsWith("/api/member/")) {
          const segments = path.replace("/api/member/", "").split("/").filter(Boolean);
          response = await handleMemberRoutes(request, env, segments);
        } else if (path === "/api/feedback") {
          response = await handleFeedbackRoutes(request, env, []);
        } else {
          response = jsonResponse(error(404, "接口不存在"), 404);
        }
      } else {
        response = jsonResponse(error(401, "未登录或登录已过期"), 401);
      }

      // 记录访问日志
      await afterRequest(ctx, request, response.status, Date.now() - startTime);

      return response;
    } catch (err) {
      // 记录错误日志
      await onError(ctx, request, err);

      const message = err instanceof Error ? err.message : "服务器内部错误";
      return jsonResponse(error(500, message), 500);
    }
  },
};
