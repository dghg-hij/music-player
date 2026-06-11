// ============================================================
// 模块11 - 缓存策略
// 缓存存储实现：基于 Cloudflare KV
// ============================================================

import { CACHE_CONFIGS, CACHE_RULES } from "./config";

/**
 * 缓存存储接口
 * 可基于 KV / Memory / Redis 等实现
 */
export interface CacheStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
}

/**
 * Cloudflare KV 缓存存储实现
 */
export class KvCacheStore implements CacheStore {
  constructor(private kv: KVNamespace) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.kv.get(key, "text");
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const options: KVNamespacePutOptions = {};
    if (ttlSeconds && ttlSeconds > 0) {
      options.expirationTtl = ttlSeconds;
    }
    await this.kv.put(key, JSON.stringify(value), options);
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const list = await this.kv.list({ prefix });
    for (const key of list.keys) {
      await this.kv.delete(key.name);
    }
  }
}

/**
 * 内存缓存存储实现（本地开发/测试用）
 */
export class MemoryCacheStore implements CacheStore {
  private store = new Map<string, { value: unknown; expiresAt: number | null }>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 每 5 分钟自动清理过期条目
    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      CACHE_RULES.cleanupInterval * 1000
    );
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** 清理过期条目 */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  /** 销毁清理定时器 */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
