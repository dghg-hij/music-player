// ============================================================
// 模块11 - 缓存策略
// 缓存服务层：提供高层缓存操作 API
// ============================================================

import { CACHE_CONFIGS, type CacheConfig } from "./config";
import type { CacheStore } from "./store";

/**
 * 缓存服务 — 封装缓存读写、失效等操作
 *
 * 使用方式：
 *   const cache = new CacheService(store);
 *   const data = await cache.get("song:detail", "123");
 *   await cache.set("song:detail", "123", songData);
 *   await cache.invalidate("song:detail", "123");
 */
export class CacheService {
  constructor(private store: CacheStore) {}

  /**
   * 生成缓存 Key
   * @param configName CACHE_CONFIGS 中的配置名
   * @param suffix 动态参数（如 uid、songId、keyword 等）
   */
  private buildKey(configName: string, suffix?: string): string {
    const config = CACHE_CONFIGS[configName];
    if (!config) throw new Error(`Unknown cache config: ${configName}`);
    return suffix ? `${config.prefix}:${suffix}` : config.prefix;
  }

  /**
   * 获取缓存
   * @param configName 缓存配置名
   * @param suffix 动态参数
   */
  async get<T = unknown>(configName: string, suffix?: string): Promise<T | null> {
    const key = this.buildKey(configName, suffix);
    return this.store.get<T>(key);
  }

  /**
   * 写入缓存
   * @param configName 缓存配置名
   * @param suffix 动态参数
   * @param value 缓存数据
   * @param customTtl 自定义 TTL（秒），不传则使用配置中的默认值
   */
  async set<T = unknown>(configName: string, suffix: string | undefined, value: T, customTtl?: number): Promise<void> {
    const config = CACHE_CONFIGS[configName];
    if (!config) throw new Error(`Unknown cache config: ${configName}`);
    const key = this.buildKey(configName, suffix);
    const ttl = customTtl ?? config.ttl;
    await this.store.set(key, value, ttl > 0 ? ttl : undefined);
  }

  /**
   * 使缓存失效（删除单个 Key）
   * @param configName 缓存配置名
   * @param suffix 动态参数
   */
  async invalidate(configName: string, suffix?: string): Promise<void> {
    const key = this.buildKey(configName, suffix);
    await this.store.delete(key);
  }

  /**
   * 按前缀批量失效
   * @param configName 缓存配置名
   */
  async invalidateByPrefix(configName: string): Promise<void> {
    const config = CACHE_CONFIGS[configName];
    if (!config) throw new Error(`Unknown cache config: ${configName}`);
    await this.store.deleteByPrefix(config.prefix);
  }

  /**
   * 带缓存的查询：先查缓存，未命中则执行查询函数并写入缓存
   * @param configName 缓存配置名
   * @param suffix 动态参数
   * @param fetcher 数据获取函数
   */
  async getOrFetch<T = unknown>(
    configName: string,
    suffix: string | undefined,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(configName, suffix);
    if (cached !== null) return cached;

    const data = await fetcher();
    await this.set(configName, suffix, data);
    return data;
  }

  // ==================== 便捷方法：业务级缓存操作 ====================

  /** 歌曲详情缓存 */
  async getSongDetail(songId: number) {
    return this.get(`song:detail`, String(songId));
  }
  async setSongDetail(songId: number, data: unknown) {
    await this.set("SONG_DETAIL", String(songId), data);
  }
  async invalidateSongDetail(songId: number) {
    await this.invalidate("SONG_DETAIL", String(songId));
  }

  /** 歌词缓存 */
  async getSongLyrics(songId: number) {
    return this.get(`song:lyrics`, String(songId));
  }
  async setSongLyrics(songId: number, data: unknown) {
    await this.set("SONG_LYRICS", String(songId), data);
  }
  async invalidateSongLyrics(songId: number) {
    await this.invalidate("SONG_LYRICS", String(songId));
  }

  /** 歌单详情缓存 */
  async getPlaylistDetail(playlistId: string) {
    return this.get(`playlist:detail`, playlistId);
  }
  async setPlaylistDetail(playlistId: string, data: unknown) {
    await this.set("PLAYLIST_DETAIL", playlistId, data);
  }
  async invalidatePlaylistDetail(playlistId: string) {
    await this.invalidate("PLAYLIST_DETAIL", playlistId);
  }

  /** 用户信息缓存 */
  async getUserInfo(uid: string) {
    return this.get(`user:info`, uid);
  }
  async setUserInfo(uid: string, data: unknown) {
    await this.set("USER_INFO", uid, data);
  }
  async invalidateUserInfo(uid: string) {
    await this.invalidate("USER_INFO", uid);
  }

  /** 用户设置缓存 */
  async getUserSettings(uid: string) {
    return this.get(`user:settings`, uid);
  }
  async setUserSettings(uid: string, data: unknown) {
    await this.set("USER_SETTINGS", uid, data);
  }
  async invalidateUserSettings(uid: string) {
    await this.invalidate("USER_SETTINGS", uid);
  }

  /** 每日推荐缓存 */
  async getDailyRecommend(uid: string) {
    return this.get(`recommend:daily`, uid);
  }
  async setDailyRecommend(uid: string, data: unknown) {
    await this.set("RECOMMEND_DAILY", uid, data);
  }
  async invalidateDailyRecommend(uid: string) {
    await this.invalidate("RECOMMEND_DAILY", uid);
  }

  /** 私人 FM 缓存 */
  async getFmRecommend(uid: string) {
    return this.get(`recommend:fm`, uid);
  }
  async setFmRecommend(uid: string, data: unknown) {
    await this.set("RECOMMEND_FM", uid, data);
  }
  async invalidateFmRecommend(uid: string) {
    await this.invalidate("RECOMMEND_FM", uid);
  }

  /** 热门搜索词缓存 */
  async getHotSearch() {
    return this.get("HOT_SEARCH");
  }
  async setHotSearch(data: unknown) {
    await this.set("HOT_SEARCH", undefined, data);
  }

  /** 热门歌曲缓存 */
  async getHotSongs() {
    return this.get("HOT_SONGS");
  }
  async setHotSongs(data: unknown) {
    await this.set("HOT_SONGS", undefined, data);
  }

  /** 搜索联想缓存 */
  async getSearchSuggest(keyword: string) {
    return this.get("SEARCH_SUGGEST", keyword);
  }
  async setSearchSuggest(keyword: string, data: unknown) {
    await this.set("SEARCH_SUGGEST", keyword, data);
  }

  /** 搜索结果缓存 */
  async getSearchResult(hash: string) {
    return this.get("SEARCH_RESULT", hash);
  }
  async setSearchResult(hash: string, data: unknown) {
    await this.set("SEARCH_RESULT", hash, data);
  }

  /** 排行榜缓存 */
  async getRank(rankId: string) {
    return this.get("RANK", rankId);
  }
  async setRank(rankId: string, data: unknown) {
    await this.set("RANK", rankId, data);
  }
}
