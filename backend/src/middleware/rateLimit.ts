// ============================================================
// 12.4 接口限流中间件
// 基于内存的滑动窗口限流，适用于 Cloudflare Worker 单实例场景
// 生产环境建议替换为 Durable Objects 或 KV 实现分布式限流
// ============================================================

/** 限流配置 */
export interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
}

/** 限流记录 */
interface RateLimitRecord {
  timestamps: number[];
}

/** 预定义限流策略（对应文档 12.4） */
export const RATE_LIMIT_POLICIES = {
  /** 普通接口：60 次/分钟 */
  normal: { windowMs: 60_000, maxRequests: 60 },
  /** 搜索接口：30 次/分钟 */
  search: { windowMs: 60_000, maxRequests: 30 },
  /** 短信验证码：1 次/分钟（同一手机号） */
  sms: { windowMs: 60_000, maxRequests: 1 },
} as const;

export type RateLimitPolicy = keyof typeof RATE_LIMIT_POLICIES;

/**
 * 内存限流器
 * 注意：Cloudflare Worker 无状态，每次请求可能在不同实例处理
 * 此实现适用于单实例开发环境，生产环境需使用 Durable Objects
 */
class MemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 5 * 60_000; // 5 分钟清理一次

  /**
   * 检查是否允许请求
   * @returns { allowed: boolean, remaining: number, resetAt: number }
   */
  check(key: string, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    this.cleanup();

    const now = Date.now();
    const windowStart = now - config.windowMs;

    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // 过滤掉窗口外的时间戳
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    if (record.timestamps.length >= config.maxRequests) {
      const resetAt = record.timestamps[0] + config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: config.maxRequests - record.timestamps.length,
      resetAt: now + config.windowMs,
    };
  }

  /** 定期清理过期记录 */
  private cleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;
    this.lastCleanup = now;

    for (const [key, record] of this.records) {
      record.timestamps = record.timestamps.filter(
        (t) => t > now - 60_000 // 保留最近 1 分钟
      );
      if (record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }
}

// 全局限流器实例（Worker 单实例内共享）
const limiter = new MemoryRateLimiter();

/**
 * 限流检查
 * @param key 限流标识（如 IP、手机号、UID）
 * @param policy 限流策略名称或自定义配置
 * @returns 限流结果
 */
export function rateLimit(
  key: string,
  policy: RateLimitPolicy | RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const config =
    typeof policy === "string" ? RATE_LIMIT_POLICIES[policy] : policy;
  return limiter.check(key, config);
}

/**
 * 根据请求路径自动选择限流策略
 */
export function getRateLimitPolicy(path: string): RateLimitPolicy {
  if (path.startsWith("/api/auth/sms/") || path.startsWith("/api/auth/sms")) {
    return "sms";
  }
  if (path.startsWith("/api/search")) {
    return "search";
  }
  return "normal";
}

/**
 * 构建限流 Key
 * 优先使用 UID，其次 IP，最后使用通用标识
 */
export function buildRateLimitKey(
  request: Request,
  uid?: string | null,
  phone?: string
): string {
  if (phone) return `sms:${phone}`;
  if (uid) return `uid:${uid}`;
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Real-IP") || "unknown";
  return `ip:${ip}`;
}
