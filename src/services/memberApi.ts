import type {
  MemberInfo,
  MemberOrder,
  MemberOrderStatus,
  MemberPlan,
  MemberRightKey,
  PayCallbackPayload,
  SubscribeRequest,
  SubscribeResponse,
} from "../types";
import { MEMBER_PLANS, MEMBER_RIGHT_META } from "../types";
import {
  useRemoteApi,
  apiClient,
  MEMBER_ENDPOINTS,
} from "./apiClient";

/**
 * 会员与付费 - 后端接口服务
 * 对应 PRD 3.7.3：
 * - GET  /api/member/info
 * - POST /api/member/subscribe
 * - POST /api/member/pay/callback
 * - GET  /api/member/check?right=xxx
 */

const MEMBER_STORAGE_KEY = "music-player-member";
const ORDERS_STORAGE_KEY = "music-player-member-orders";
const MOCK_LATENCY = 400;

function delay<T>(value: T, ms: number = MOCK_LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateOrderNo(): string {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `M${now}${rand}`;
}

export function computeRights(level: MemberInfo["level"], expireTime: number): MemberRightKey[] {
  if (level === "normal" || expireTime <= Date.now()) {
    return [];
  }
  return (Object.keys(MEMBER_RIGHT_META) as MemberRightKey[]).filter((key) => {
    const min = MEMBER_RIGHT_META[key].minMember;
    if (min === "vip") return level === "vip" || level === "svip";
    if (min === "svip") return level === "svip";
    return false;
  });
}

function computeExpire(baseExpire: number, cycle: MemberPlan["cycle"]): number {
  const start = baseExpire > Date.now() ? baseExpire : Date.now();
  switch (cycle) {
    case "month":
      return start + 30 * 24 * 60 * 60 * 1000;
    case "quarter":
      return start + 90 * 24 * 60 * 60 * 1000;
    case "year":
      return start + 365 * 24 * 60 * 60 * 1000;
  }
}

/** GET /api/member/info */
export async function fetchMemberInfo(uid: string): Promise<MemberInfo> {
  if (useRemoteApi()) {
    try {
      const res = await apiClient.get<MemberInfo>("/member/info");
      if (res.code === 200 && res.data) return res.data;
    } catch { /* fallback to local */ }
  }
  const map = safeParse<Record<string, MemberInfo>>(localStorage.getItem(MEMBER_STORAGE_KEY), {});
  const info = map[uid];
  if (!info) {
    const empty: MemberInfo = {
      uid,
      level: "normal",
      expireTime: 0,
      autoRenew: 0,
      createdAt: 0,
      rights: [],
    };
    return delay(empty, 100);
  }
  if (info.expireTime > 0 && info.expireTime <= Date.now()) {
    const expired: MemberInfo = { ...info, level: "normal", rights: [] };
    return delay(expired, 100);
  }
  return delay({ ...info, rights: computeRights(info.level, info.expireTime) }, 100);
}

function saveMemberInfo(info: MemberInfo): void {
  const map = safeParse<Record<string, MemberInfo>>(localStorage.getItem(MEMBER_STORAGE_KEY), {});
  map[info.uid] = info;
  localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(map));
}

/** GET /api/member/check?right=xxx */
export async function checkMemberRight(uid: string, right: MemberRightKey): Promise<boolean> {
  if (useRemoteApi()) {
    try {
      const res = await apiClient.get<{ hasRight: boolean }>("/member/check", { right });
      if (res.code === 200 && res.data) return res.data.hasRight;
    } catch { /* fallback to local */ }
  }
  const info = await fetchMemberInfo(uid);
  return info.rights.includes(right);
}

/** POST /api/member/subscribe */
export async function subscribeMember(
  uid: string,
  req: SubscribeRequest
): Promise<SubscribeResponse> {
  if (useRemoteApi()) {
    const res = await apiClient.post<SubscribeResponse>("/member/subscribe", {
      planId: req.planId,
      paymentMethod: req.paymentMethod,
    });
    if (res.code === 200 && res.data) return res.data;
  }
  const plan = MEMBER_PLANS.find((p) => p.id === req.planId);
  if (!plan) {
    return delay(Promise.reject(new Error("套餐不存在")) as never, 100).catch((e) => {
      throw e;
    });
  }
  const orderNo = generateOrderNo();
  const order: MemberOrder = {
    orderNo,
    planId: plan.id,
    level: plan.level,
    cycle: plan.cycle,
    amount: plan.price,
    paymentMethod: req.paymentMethod,
    status: "pending",
    createdAt: Date.now(),
  };
  const orders = safeParse<MemberOrder[]>(localStorage.getItem(ORDERS_STORAGE_KEY), []);
  orders.unshift(order);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));

  const payUrl = `${window.location.origin}${window.location.pathname}#/member/pay-callback?orderNo=${orderNo}`;

  return delay({
    orderId: orderNo,
    orderNo,
    amount: plan.price,
    payUrl,
  });
}

/** POST /api/member/pay/callback */
export async function payCallback(uid: string, payload: PayCallbackPayload): Promise<MemberInfo> {
  if (useRemoteApi()) {
    const res = await apiClient.post<MemberInfo>("/member/pay/callback", payload);
    if (res.code === 200 && res.data) return res.data;
    throw new Error(res.message || "支付失败");
  }
  const orders = safeParse<MemberOrder[]>(localStorage.getItem(ORDERS_STORAGE_KEY), []);
  const idx = orders.findIndex((o) => o.orderNo === payload.orderNo);
  if (idx === -1) {
    return delay(Promise.reject(new Error("订单不存在")) as never).catch((e) => {
      throw e;
    });
  }
  const order = orders[idx];
  if (order.status === "paid") {
    return fetchMemberInfo(uid);
  }
  if (payload.status !== "success") {
    orders[idx] = { ...order, status: "cancelled" };
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    return delay(Promise.reject(new Error("支付失败")) as never).catch((e) => {
      throw e;
    });
  }

  const map = safeParse<Record<string, MemberInfo>>(localStorage.getItem(MEMBER_STORAGE_KEY), {});
  const prev = map[uid];
  const baseExpire = prev?.expireTime ?? 0;
  const newExpire = computeExpire(baseExpire, order.cycle);
  const updated: MemberInfo = {
    uid,
    level: order.level,
    expireTime: newExpire,
    autoRenew: prev?.autoRenew ?? 0,
    createdAt: prev?.createdAt ?? Date.now(),
    rights: computeRights(order.level, newExpire),
  };
  saveMemberInfo(updated);
  orders[idx] = {
    ...order,
    status: "paid" as MemberOrderStatus,
    paidAt: Date.now(),
    effectiveUntil: newExpire,
  };
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  return delay(updated);
}

export async function fetchMemberOrders(): Promise<MemberOrder[]> {
  const list = safeParse<MemberOrder[]>(localStorage.getItem(ORDERS_STORAGE_KEY), []);
  return delay(list, 100);
}

export async function cancelOrder(orderNo: string): Promise<boolean> {
  const orders = safeParse<MemberOrder[]>(localStorage.getItem(ORDERS_STORAGE_KEY), []);
  const idx = orders.findIndex((o) => o.orderNo === orderNo);
  if (idx === -1 || orders[idx].status !== "pending") return delay(false, 100);
  orders[idx] = { ...orders[idx], status: "cancelled" };
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  return delay(true, 100);
}
