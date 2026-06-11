import { success, errorResponse, authenticate, parseBody, corsHeaders } from "../utils";

interface Env {
  DB: D1Database;
}

export async function handleFeedbackRoutes(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const method = request.method;
  const path = new URL(request.url).pathname;

  // POST /api/feedback
  if (method === "POST" && path === "/api/feedback") {
    const uid = await authenticate(request, env.DB);
    if (!uid) {
      return errorResponse(401, "未授权");
    }

    const body = await parseBody<{
      content: string;
      contact?: string;
      screenshot?: string;
    }>(request);

    if (!body.content) {
      return errorResponse(400, "反馈内容不能为空");
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await env.DB.prepare(
      "INSERT INTO t_feedback (uid, content, contact, screenshot, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)"
    )
      .bind(uid, body.content, body.contact ?? "", body.screenshot ?? "", now)
      .run();

    const id = result.meta.last_row_id;
    return success({ id });
  }

  return errorResponse(404, "路由不存在");
}
