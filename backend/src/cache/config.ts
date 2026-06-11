// ============================================================
// 模块11 - 缓存策略
// 缓存配置：Key 前缀、TTL、更新机制
// 与接口文档 11.1 节一一对应
// ============================================================

/** 缓存条目配置 */
export interface CacheConfig {
  /** 缓存 Key 前缀 */
  prefix: string;
  /** 默认 TTL（秒） */
  ttl: number;
  /** 更新机制 */
  strategy: "定时任务刷新" | "被动过期" | "变更时主动失效" | "变更时主动更新";
}

/**
 * 缓存配置表 — 对应接口文档 11.1 客户端缓存
 *
 * 在 Cloudflare Worker 环境中，使用 KV 作为服务端缓存存储
 * Key 格式：{prefix}:{动态参数}
 */
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  /** 热门歌曲列表 */
  HOT_SONGS: {
    prefix: "hot:songs",
    ttl: 10 * 60, // 10 分钟
    strategy: "定时任务刷新",
  },
  /** 热门搜索词 */
  HOT_SEARCH: {
    prefix: "hot:search",
    ttl: 30 * 60, // 30 分钟
    strategy: "定时任务刷新",
  },
  /** 搜索联想词 */
  SEARCH_SUGGEST: {
    prefix: "search:suggest",
    ttl: 5 * 60, // 5 分钟
    strategy: "被动过期",
  },
  /** 搜索结果 */
  SEARCH_RESULT: {
    prefix: "search:result",
    ttl: 10 * 60, // 10 分钟
    strategy: "被动过期",
  },
  /** 每日推荐 */
  RECOMMEND_DAILY: {
    prefix: "recommend:daily",
    ttl: 6 * 60 * 60, // 6 小时
    strategy: "定时任务刷新",
  },
  /** 私人 FM 歌曲 */
  RECOMMEND_FM: {
    prefix: "recommend:fm",
    ttl: 30 * 60, // 30 分钟
    strategy: "被动过期",
  },
  /** 歌曲详情 */
  SONG_DETAIL: {
    prefix: "song:detail",
    ttl: 60 * 60, // 1 小时
    strategy: "变更时主动失效",
  },
  /** 歌词数据 */
  SONG_LYRICS: {
    prefix: "song:lyrics",
    ttl: 24 * 60 * 60, // 24 小时
    strategy: "变更时主动失效",
  },
  /** 歌单详情 */
  PLAYLIST_DETAIL: {
    prefix: "playlist:detail",
    ttl: 30 * 60, // 30 分钟
    strategy: "变更时主动失效",
  },
  /** 用户设置 */
  USER_SETTINGS: {
    prefix: "user:settings",
    ttl: 0, // 无过期
    strategy: "变更时主动更新",
  },
  /** 用户信息 */
  USER_INFO: {
    prefix: "user:info",
    ttl: 60 * 60, // 1 小时
    strategy: "变更时主动失效",
  },
  /** 排行榜 */
  RANK: {
    prefix: "rank",
    ttl: 60 * 60, // 1 小时
    strategy: "定时任务刷新",
  },
};

/**
 * 缓存规则 — 对应接口文档 11.2 缓存规则
 */
export const CACHE_RULES = {
  /** 仅 GET 请求使用缓存 */
  onlyGetRequests: true,
  /** 缓存写入条件：请求成功（code=200） */
  writeOnSuccessOnly: true,
  /** 支持按前缀批量删除 */
  supportPrefixDelete: true,
  /** 自动清理间隔（秒） */
  cleanupInterval: 5 * 60, // 5 分钟
} as const;
