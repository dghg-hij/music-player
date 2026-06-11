import { success, errorResponse, authenticate, parseBody, corsHeaders } from "../utils";

interface Env {
  DB: D1Database;
}

const VIP_RIGHTS = ["quality.high", "noAds", "paidLibrary", "fastDownload"];
const SVIP_RIGHTS = [
  "quality.high", "noAds", "paidLibrary", "fastDownload",
  "quality.lossless", "exclusiveFx", "earlyAccess",
];

const PLANS: Record<string, { level: string; cycle: string; amount: number; duration: number }> = {
  vip_month: { level: "vip", cycle: "month", amount: 25, duration: 30 * 24 * 3600 },
  vip_quarter: { level: "vip", cycle: "quarter", amount: 68, duration: 90 * 24 * 3600 },
  vip_year: { level: "vip", cycle: "year", amount: 228, duration: 365 * 24 * 3600 },
  svip_month: { level: "svip", cycle: "month", amount: 35, duration: 30 * 24 * 3600 },
  svip_quarter: { level: "svip", cycle: "quarter", amount: 98, duration: 90 * 24 * 3600 },
  svip_year: { level: "svip", cycle: "year", amount: 348, duration: 365 * 24 * 3600 },
};

function computeRights(level: string): string[] {
  if (level === "svip") return SVIP_RIGHTS;
  if (level === "vip") return VIP_RIGHTS;
  return [];
}

function buildMemberInfo(row: { uid: string; level: string; expire_time: number; auto_renew: number; created_at: number } | null) {
  if (!row) {
    return { uid: "", level: "normal", expireTime: 0, autoRenew: 0, createdAt: 0, rights: [] };
  }
  const now = Math.floor(Date.now() / 1000);
  const effectiveLevel = row.expire_time < now ? "normal" : row.level;
  return {
    uid: row.uid,
    level: effectiveLevel,
    expireTime: row.expire_time,
    autoRenew: row.auto_renew,
    createdAt: row.created_at,
    rights: computeRights(effectiveLevel),
  };
}

export async function handleMemberRoutes(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  const uid = await authenticate(request, env.DB);
  if (!uid) {
    return errorResponse(401, "未授权");
  }

  // GET /api/member/info
  if (method === "GET" && path === "/api/member/info") {
    const row = await env.DB.prepare(
      "SELECT uid, level, expire_time, auto_renew, created_at FROM t_member WHERE uid = ?"
    )
      .bind(uid)
      .first<{ uid: string; level: string; expire_time: number; auto_renew: number; created_at: number }>();

    const memberInfo = buildMemberInfo(row ? { ...row, uid } : null);
    memberInfo.uid = uid;
    return success(memberInfo);
  }

  // POST /api/member/subscribe
  if (method === "POST" && path === "/api/member/subscribe") {
    const body = await parseBody<{ planId: string; paymentMethod: string }>(request);
    if (!body.planId || !body.paymentMethod) {
      return errorResponse(400, "参数不完整");
    }

    const plan = PLANS[body.planId];
    if (!plan) {
      return errorResponse(400, "无效的套餐");
    }

    const orderNo = `ord_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "INSERT INTO t_order (order_no, uid, plan_id, level, cycle, amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)"
    )
      .bind(orderNo, uid, body.planId, plan.level, plan.cycle, plan.amount, body.paymentMethod, now)
      .run();

    const payUrl = `/api/member/pay?orderNo=${orderNo}`;
    return success({ orderNo, amount: plan.amount, payUrl });
  }

  // POST /api/member/pay/callback
  if (method === "POST" && path === "/api/member/pay/callback") {
    const body = await parseBody<{ orderNo: string; status: string }>(request);
    if (!body.orderNo || !body.status) {
      return errorResponse(400, "参数不完整");
    }

    const order = await env.DB.prepare(
      "SELECT order_no, uid, plan_id, level, cycle, amount, status FROM t_order WHERE order_no = ?"
    )
      .bind(body.orderNo)
      .first<{
        order_no: string; uid: string; plan_id: string; level: string;
        cycle: string; amount: number; status: string;
      }>();

    if (!order) return errorResponse(404, "订单不存在");
    if (order.status !== "pending") return errorResponse(400, "订单状态不可变更");

    const now = Math.floor(Date.now() / 1000);

    if (body.status === "success") {
      const plan = PLANS[order.plan_id];
      if (!plan) return errorResponse(400, "无效的套餐");

      await env.DB.prepare(
        "UPDATE t_order SET status = 'paid', paid_at = ? WHERE order_no = ?"
      )
        .bind(now, body.orderNo)
        .run();

      const existingMember = await env.DB.prepare(
        "SELECT level, expire_time FROM t_member WHERE uid = ?"
      )
        .bind(order.uid)
        .first<{ level: string; expire_time: number }>();

      const baseExpire = existingMember && existingMember.expire_time > now
        ? existingMember.expire_time
        : now;
      const newExpireTime = baseExpire + plan.duration;

      await env.DB.prepare(
        "INSERT INTO t_member (uid, level, expire_time, auto_renew, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?) ON CONFLICT(uid) DO UPDATE SET level = ?, expire_time = ?, updated_at = ?"
      )
        .bind(order.uid, order.level, newExpireTime, now, now, order.level, newExpireTime, now)
        .run();

      const updatedMember = await env.DB.prepare(
        "SELECT uid, level, expire_time, auto_renew, created_at FROM t_member WHERE uid = ?"
      )
        .bind(order.uid)
        .first<{ uid: string; level: string; expire_time: number; auto_renew: number; created_at: number }>();

      return success(buildMemberInfo(updatedMember));
    } else {
      await env.DB.prepare(
        "UPDATE t_order SET status = 'cancelled' WHERE order_no = ?"
      )
        .bind(body.orderNo)
        .run();

      const memberRow = await env.DB.prepare(
        "SELECT uid, level, expire_time, auto_renew, created_at FROM t_member WHERE uid = ?"
      )
        .bind(order.uid)
        .first<{ uid: string; level: string; expire_time: number; auto_renew: number; created_at: number }>();

      const memberInfo = buildMemberInfo(memberRow ? { ...memberRow, uid: order.uid } : null);
      memberInfo.uid = order.uid;
      return success(memberInfo);
    }
  }

  // GET /api/member/check
  if (method === "GET" && path === "/api/member/check") {
    const right = url.searchParams.get("right");
    if (!right) {
      return errorResponse(400, "缺少 right 参数");
    }

    const row = await env.DB.prepare(
      "SELECT uid, level, expire_time, auto_renew, created_at FROM t_member WHERE uid = ?"
    )
      .bind(uid)
      .first<{ uid: string; level: string; expire_time: number; auto_renew: number; created_at: number }>();

    const memberInfo = buildMemberInfo(row ? { ...row, uid } : null);
    memberInfo.uid = uid;
    const hasRight = memberInfo.rights.includes(right);
    return success({ hasRight });
  }

  return errorResponse(404, "路由不存在");
}
