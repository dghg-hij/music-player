// ============================================================
// 模块11 - 缓存策略
// 统一导出
// ============================================================

export { CACHE_CONFIGS, CACHE_RULES, type CacheConfig } from "./config";
export { CacheService } from "./service";
export { KvCacheStore, MemoryCacheStore, type CacheStore } from "./store";
export { cacheMiddleware, cacheWrite } from "./middleware";
