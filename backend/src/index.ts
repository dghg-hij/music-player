// ============================================================
// 音乐播放器后端 - Cloudflare Worker 入口
// ============================================================

import { error, errorResponse, authenticate, corsHeaders } from "./utils";
import { handleAuthRoutes } from "./routes/auth";
import { handleUserRoutes } from "./routes/user";
import { handlePlaylistRoutes } from "./routes/playlist";
import { handleMemberRoutes } from "./routes/member";
import { handleFeedbackRoutes } from "./routes/feedback";

export interface Env {
  DB: D1Database;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // /api/auth/* — 认证路由（无需鉴权）
      if (path.startsWith("/api/auth/")) {
        const segments = path.replace("/api/auth/", "").split("/").filter(Boolean);
        return await handleAuthRoutes(request, env, segments);
      }

      // 以下路由均需鉴权
      const uid = await authenticate(request, env.DB);
      if (!uid) {
        return jsonResponse(error(401, "未登录或登录已过期"), 401);
      }

      // /api/user/* — 用户路由
      if (path.startsWith("/api/user/")) {
        const segments = path.replace("/api/user/", "").split("/").filter(Boolean);
        return await handleUserRoutes(request, env, segments);
      }

      // /api/playlist/* — 歌单路由
      if (path.startsWith("/api/playlist/")) {
        const segments = path.replace("/api/playlist/", "").split("/").filter(Boolean);
        return await handlePlaylistRoutes(request, env, segments);
      }

      // /api/member/* — 会员路由
      if (path.startsWith("/api/member/")) {
        const segments = path.replace("/api/member/", "").split("/").filter(Boolean);
        return await handleMemberRoutes(request, env, segments);
      }

      // /api/feedback — 反馈路由
      if (path === "/api/feedback") {
        return await handleFeedbackRoutes(request, env, []);
      }

      // 404
      return jsonResponse(error(404, "接口不存在"), 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : "服务器内部错误";
      return jsonResponse(error(500, message), 500);
    }
  },
};
