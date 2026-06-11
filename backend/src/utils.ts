/** 统一响应工具函数 */

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export function success<T>(data: T, message = "请求成功"): Response {
  return Response.json(
    { code: 200, message, data, timestamp: Date.now() },
    { headers: corsHeaders }
  );
}

export function error(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null, timestamp: Date.now() };
}

export function errorResponse(code: number, message: string): Response {
  return Response.json(
    error(code, message),
    { status: code >= 400 && code < 600 ? code : 400, headers: corsHeaders }
  );
}

export async function parseBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  const body = await request.json() as T;
  return body;
}

export function generateUid(): string {
  return (
    String(Date.now()).slice(-8) +
    String(Math.floor(Math.random() * 10000)).padStart(4, "0")
  );
}

export function generateToken(): string {
  return "token_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export function generateSmsCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/** 从 access_token 查找 uid，未找到或已过期返回 null */
export async function getUidFromToken(accessToken: string, db: D1Database): Promise<string | null> {
  const row = await db.prepare(
    "SELECT uid, access_expires_at FROM t_token WHERE access_token = ?"
  )
    .bind(accessToken)
    .first<{ uid: string; access_expires_at: number }>();

  if (!row) return null;
  if (row.access_expires_at <= Date.now()) return null;
  return row.uid;
}

/** 从请求头提取 Bearer Token 并验证，返回 uid 或 null */
export async function authenticate(request: Request, db: D1Database): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const accessToken = authHeader.slice(7);
  return getUidFromToken(accessToken, db);
}
