// PRD 4 后端整体设计：以下导入为 remote API 模式预留，切换 VITE_API_MODE=remote 后启用
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  useRemoteApi,
  SONG_ENDPOINTS,
  SEARCH_ENDPOINTS,
  LIBRARY_ENDPOINTS,
  RECOMMEND_ENDPOINTS,
} from "./apiClient";
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * PRD 6.1/6.2：Toast 通知辅助函数
 * 使用事件机制避免与 playerStore 的循环依赖
 * （playerStore 在 App.tsx 中监听 "api:toast" 事件并调用 showToast）
 */
function emitToast(message: string, type: "info" | "success" | "warning" | "error" = "error"): void {
  try {
    window.dispatchEvent(new CustomEvent("api:toast", { detail: { message, type } }));
  } catch { /* 环境不支持 CustomEvent */ }
}

const API_BASE = import.meta.env.DEV
  ? "/api/163_music"
  : "https://api.bugpk.com/api/163_music";

// PRD 6.1：请求超时自动重试1次，仍失败则提示用户
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries: number = 1
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      if (attempt < retries) {
        // 等待 1 秒后重试
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// 音源 URL 缓存，避免重复请求和 URL 过期
const urlCache = new Map<number, { url: string; expireAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟过期

export interface SearchResult {
  id: number;
  name: string;
  artists: string;
  album: string;
  picUrl: string;
  duration: number;
}

export async function searchSongs(
  keyword: string,
  limit: number = 1
): Promise<SearchResult[]> {
  try {
    const res = await fetchWithRetry(
      `${API_BASE}?type=search&s=${encodeURIComponent(keyword)}&limit=${limit}`
    );
    if (!res.ok) {
      // PRD 6.1：服务器错误
      if (res.status >= 500) {
        try { emitToast("服务异常，请稍后重试", "error"); } catch { /* ignore */ }
      }
      return [];
    }
    const json = await res.json();
    if (json.code === 200 && json.data?.songs) {
      return json.data.songs;
    }
    return [];
  } catch {
    // PRD 6.1：请求超时重试后仍失败
    try { emitToast("网络连接失败", "error"); } catch { /* ignore */ }
    return [];
  }
}

export async function getSongUrl(id: number, quality: "standard" | "high" | "lossless" = "lossless"): Promise<string | null> {
  // 音质映射到网易云 level：standard/standard, high/exhigh, lossless/hires
  const levelMap: Record<string, string> = {
    standard: "standard",
    high: "exhigh",
    lossless: "hires",
  };
  const level = levelMap[quality] || "hires";

  // 检查缓存（按 songId + quality 区分）
  const cacheKey = id * 10 + (quality === "standard" ? 0 : quality === "high" ? 1 : 2);
  const cached = urlCache.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.url;
  }

  // 优化音质：依次尝试 hires → exhigh → standard，确保用户始终获得最佳可用音质
  const fallbackChain: Array<"hires" | "exhigh" | "standard"> = ["hires", "exhigh", "standard"];
  const requestedLevel = level;

  for (const tryLevel of fallbackChain) {
    try {
      const res = await fetchWithRetry(
        `${API_BASE}?type=url&id=${id}&level=${tryLevel}`
      );
      if (!res.ok) {
        // 403/付费墙：继续尝试下一档
        if (res.status === 403) {
          continue;
        }
        // PRD 6.1：服务器错误
        if (res.status >= 500) {
          try { emitToast("服务异常，请稍后重试", "error"); } catch { /* ignore */ }
        }
        return null;
      }
      const json = await res.json();
      if (json.code !== 200 || !json.data?.[0]?.url) {
        // 该档位无资源，继续尝试下一档
        continue;
      }
      const url = json.data[0].url;
      // 写入缓存（按用户请求的 quality 维度）
      urlCache.set(cacheKey, { url, expireAt: Date.now() + CACHE_TTL });
      // 提示用户：实际获得的音质
      if (tryLevel !== requestedLevel) {
        try {
          const levelNameMap: Record<string, string> = {
            hires: "无损",
            exhigh: "高清",
            standard: "标准",
          };
          emitToast(`该歌曲仅提供${levelNameMap[tryLevel] ?? "标准"}音质`, "info");
        } catch { /* ignore */ }
      }
      return url;
    } catch {
      // 网络错误：尝试下一档
      continue;
    }
  }

  // 三档都不可用
  try { emitToast("网络连接失败", "error"); } catch { /* ignore */ }
  return null;
}

export async function getSongLyric(id: number): Promise<string> {
  try {
    const res = await fetchWithRetry(
      `${API_BASE}?type=lyric&id=${id}`
    );
    if (!res.ok) return "";
    const json = await res.json();
    if (json.code === 200 && json.data?.lrc) {
      return json.data.lrc;
    }
    return "";
  } catch {
    return "";
  }
}

export interface ChartSong {
  id: number;
  name: string;
  artists: string;
  album: string;
  picUrl: string;
  duration: number;
}

// 获取基于周日的缓存 key，确保排行榜在周日午夜更新
function getWeekKey(): string {
  const now = new Date();
  // Get the most recent Sunday (or today if Sunday)
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  const y = sunday.getFullYear();
  const m = String(sunday.getMonth() + 1).padStart(2, '0');
  const d = String(sunday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 从 localStorage 读取每周缓存
function getCachedChart(playlistId: string): ChartSong[] | null {
  try {
    const key = `chart_${playlistId}_${getWeekKey()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// 写入每周缓存
function setCachedChart(playlistId: string, songs: ChartSong[]): void {
  try {
    const key = `chart_${playlistId}_${getWeekKey()}`;
    localStorage.setItem(key, JSON.stringify(songs));
  } catch {
    // localStorage 满了就忽略
  }
}

export async function getChartSongs(playlistId: string, limit: number = 30, keyword?: string, forceRefresh: boolean = false): Promise<ChartSong[]> {
  // 先查缓存
  const cached = !forceRefresh && getCachedChart(playlistId);
  if (cached && cached.length > 0) return cached;

  try {
    // playlist API 经常超时，优先使用 search API
    if (keyword) {
      const results = await searchSongs(keyword, limit);
      if (results.length > 0) {
        const songs: ChartSong[] = results.map((s) => ({
          id: s.id,
          name: s.name,
          artists: s.artists,
          album: s.album,
          picUrl: s.picUrl,
          duration: s.duration,
        }));
        if (songs.length > 0) setCachedChart(playlistId, songs);
        return songs;
      }
    }

    // 回退到 playlist API（PRD 6.1：使用 fetchWithRetry 替代裸 fetch）
    const res = await fetchWithRetry(
      `${API_BASE}?type=playlist&id=${playlistId}`
    );
    if (!res.ok) {
      if (res.status >= 500) {
        emitToast("服务异常，请稍后重试", "error");
      }
      return [];
    }
    const json = await res.json();
    if (json.code === 200 && json.data?.songs) {
      const songs: ChartSong[] = json.data.songs.slice(0, limit).map((s: SearchResult) => ({
        id: s.id,
        name: s.name,
        artists: s.artists,
        album: s.album,
        picUrl: s.picUrl,
        duration: s.duration,
      }));
      if (songs.length > 0) setCachedChart(playlistId, songs);
      return songs;
    }
    return [];
  } catch {
    // PRD 6.1：请求失败
    emitToast("网络连接失败", "error");
    return [];
  }
}

export interface HotSong {
  id: number;
  name: string;
  artists: string;
  album: string;
  picUrl: string;
  duration: number;
  heat: number;
}

// 热歌榜使用网易云官方热歌榜
const HOT_CHART_PLAYLIST_ID = "3778678";

export async function getHotSongs(limit: number = 20, forceRefresh: boolean = false): Promise<HotSong[]> {
  // 先查缓存
  const cached = !forceRefresh && getCachedChart(HOT_CHART_PLAYLIST_ID);
  if (cached && cached.length > 0) {
    return cached.map((s, i) => ({
      ...s,
      heat: Math.floor(1000000 - i * 40000 + Math.random() * 10000),
    }));
  }

  try {
    // 优先使用 search API（playlist API 经常超时）
    const results = await searchSongs("热门歌曲", limit);
    if (results.length > 0) {
      const songs: HotSong[] = results.map((s, i) => ({
        id: s.id,
        name: s.name,
        artists: s.artists,
        album: s.album,
        picUrl: s.picUrl,
        duration: s.duration,
        heat: Math.floor(1000000 - i * 40000 + Math.random() * 10000),
      }));
      const chartSongs: ChartSong[] = results.map((s) => ({
        id: s.id, name: s.name, artists: s.artists, album: s.album, picUrl: s.picUrl, duration: s.duration,
      }));
      if (chartSongs.length > 0) setCachedChart(HOT_CHART_PLAYLIST_ID, chartSongs);
      return songs;
    }

    // 回退到 playlist API（PRD 6.1：使用 fetchWithRetry 替代裸 fetch）
    const res = await fetchWithRetry(
      `${API_BASE}?type=playlist&id=${HOT_CHART_PLAYLIST_ID}`
    );
    if (!res.ok) {
      if (res.status >= 500) {
        emitToast("服务异常，请稍后重试", "error");
      }
      return [];
    }
    const json = await res.json();
    if (json.code === 200 && json.data?.songs) {
      const songs: HotSong[] = json.data.songs.slice(0, limit).map((s: SearchResult, i: number) => ({
        id: s.id,
        name: s.name,
        artists: s.artists,
        album: s.album,
        picUrl: s.picUrl,
        duration: s.duration,
        heat: Math.floor(1000000 - i * 40000 + Math.random() * 10000),
      }));
      const chartSongs: ChartSong[] = json.data.songs.slice(0, limit).map((s: SearchResult) => ({
        id: s.id, name: s.name, artists: s.artists, album: s.album, picUrl: s.picUrl, duration: s.duration,
      }));
      if (chartSongs.length > 0) setCachedChart(HOT_CHART_PLAYLIST_ID, chartSongs);
      return songs;
    }
    return [];
  } catch {
    // PRD 6.1：请求失败
    emitToast("网络连接失败", "error");
    return [];
  }
}

export function clearChartCache(playlistId?: string): void {
  try {
    if (playlistId) {
      // Remove all cache entries for this playlistId
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`chart_${playlistId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } else {
      // Clear all chart caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chart_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch { /* ignore */ }
}

export function clearHotSongsCache(): void {
  clearChartCache(HOT_CHART_PLAYLIST_ID);
}

export interface LyricLine {
  time: number;
  text: string;
}

// 播放上报 - PRD 3.2.7 POST /api/song/play-report
export interface PlayReportPayload {
  songId: number;
  playTime: number;
  progress: number;
  device: string;
}

const REPORT_QUEUE: PlayReportPayload[] = [];
let reporting = false;

async function flushReports(): Promise<void> {
  if (reporting || REPORT_QUEUE.length === 0) return;
  reporting = true;
  try {
    while (REPORT_QUEUE.length > 0) {
      const payload = REPORT_QUEUE.shift();
      if (!payload) break;
      try {
        // 模拟上报：本地记录 + 异步 console
        console.log("[PlayReport]", payload);
        // 真实环境中应调用后端 /api/song/play-report
        // await fetch('/api/song/play-report', { method: 'POST', body: JSON.stringify(payload) });
      } catch {
        // 上报失败，重新放回队尾
        REPORT_QUEUE.push(payload);
        break;
      }
    }
  } finally {
    reporting = false;
  }
}

/**
 * 上报播放进度。会自动去重 + 批量合并，避免每 30s 上百次请求。
 */
export function reportPlay(payload: PlayReportPayload): void {
  // 同歌曲的最新 progress 覆盖旧的
  const idx = REPORT_QUEUE.findIndex(
    (p) => p.songId === payload.songId && p.playTime === payload.playTime
  );
  if (idx >= 0) REPORT_QUEUE[idx] = payload;
  else REPORT_QUEUE.push(payload);
  void flushReports();
}

/**
 * 歌曲播放结束时强制上报一次最终进度。
 */
export function reportPlayEnd(songId: number, playTime: number, progress: number): void {
  reportPlay({ songId, playTime, progress, device: "web" });
}

export function parseLRC(lrc: string): LyricLine[] {
  const lines = lrc.split("\n");
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  // 解析 offset
  let offsetMs = 0;
  const offsetMatch = lrc.match(/\[offset:(-?\d+)\]/);
  if (offsetMatch) {
    offsetMs = parseInt(offsetMatch[1], 10);
  }

  for (const line of lines) {
    // 跳过纯元数据行 [ti:xxx] [ar:xxx] [al:xxx] [by:xxx] [offset:xxx]
    if (/^\[(ti|ar|al|by|offset):/.test(line.trim())) continue;

    const times: number[] = [];
    let match: RegExpExecArray | null;

    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3].length === 3 ? parseInt(match[3], 10) : parseInt(match[3], 10) * 10;
      times.push(min * 60 + sec + ms / 1000 + offsetMs / 1000);
    }

    const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();

    if (times.length > 0 && text) {
      for (const time of times) {
        result.push({ time: Math.max(0, time), text });
      }
    }
  }

  result.sort((a, b) => a.time - b.time);

  // 去重：相同时间只保留最后一条
  for (let i = result.length - 1; i > 0; i--) {
    if (Math.abs(result[i].time - result[i - 1].time) < 0.01) {
      result.splice(i - 1, 1);
    }
  }

  return result;
}

// ============================================
// 模块 3：音乐搜索与乐库 - 扩展 API
// ============================================

// 歌单广场 - 预置歌单专辑
export interface PlaylistAlbum {
  id: string;
  name: string;
  cover: string;
  description: string;
  /** 用于搜索真实歌曲的关键词 */
  keyword: string;
  accent: string;
}

export const PLAYLIST_ALBUMS: PlaylistAlbum[] = [
  {
    id: "pa_ancient",
    name: "古风歌单",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20ancient%20ink%20painting%20mountain%20moon%20elegant%20serene&image_size=square_hd",
    description: "墨色山水 · 国韵悠长",
    keyword: "古风",
    accent: "#A855F7",
  },
  {
    id: "pa_ancient_drama",
    name: "古风影视歌单",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20ancient%20palace%20costume%20drama%20moon%20lantern&image_size=square_hd",
    description: "古装剧中的经典旋律",
    keyword: "古风 影视",
    accent: "#7C3AED",
  },
  {
    id: "pa_modern_drama",
    name: "现代影视歌单",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20movie%20soundtrack%20cinema%20purple%20lights%20dramatic&image_size=square_hd",
    description: "影视剧 OST 经典",
    keyword: "影视 OST",
    accent: "#EC4899",
  },
  {
    id: "pa_chinese_pop",
    name: "华语流行经典",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=neon%20pop%20music%20concert%20lights%20vibrant%20orange&image_size=square_hd",
    description: "华语流行 · 时代金曲",
    keyword: "华语 流行",
    accent: "#F97316",
  },
  {
    id: "pa_folk",
    name: "民谣诗与远方",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=acoustic%20guitar%20countryside%20warm%20sunset%20meadow&image_size=square_hd",
    description: "诗与远方的民谣",
    keyword: "民谣",
    accent: "#22C55E",
  },
  {
    id: "pa_rock",
    name: "摇滚狂潮",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rock%20electric%20guitar%20fire%20stage%20dark%20red&image_size=square_hd",
    description: "热血澎湃的摇滚",
    keyword: "摇滚",
    accent: "#EF4444",
  },
  {
    id: "pa_electronic",
    name: "电子律动",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=synthwave%20electronic%20neon%20city%20night%20blue&image_size=square_hd",
    description: "Synthwave 与 City Pop",
    keyword: "电子",
    accent: "#06B6D4",
  },
  {
    id: "pa_rnb",
    name: "R&B 慵懒周末",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rnb%20jazz%20vintage%20lounge%20warm%20lights&image_size=square_hd",
    description: "灵魂律动的慵懒午后",
    keyword: "R&B",
    accent: "#0EA5E9",
  },
  {
    id: "pa_sleep",
    name: "夜晚助眠轻音乐",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sleep%20calm%20music%20night%20purple%20stars%20dream&image_size=square_hd",
    description: "伴你入眠的轻柔旋律",
    keyword: "轻音乐",
    accent: "#8B5CF6",
  },
  {
    id: "pa_workout",
    name: "运动健身燃脂",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sport%20workout%20music%20energetic%20red%20fire&image_size=square_hd",
    description: "燃脂跑步的节奏鼓点",
    keyword: "运动",
    accent: "#F59E0B",
  },
  {
    id: "pa_study",
    name: "学习工作背景音",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=study%20focus%20lofi%20cozy%20desk%20warm&image_size=square_hd",
    description: "专注力提升的轻音",
    keyword: "学习",
    accent: "#14B8A6",
  },
  {
    id: "pa_drive",
    name: "开车兜风必备",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=driving%20road%20music%20open%20sky%20freedom%20blue&image_size=square_hd",
    description: "一路向前的自由节拍",
    keyword: "驾驶",
    accent: "#0EA5E9",
  },
  {
    id: "pa_military",
    name: "军旅战歌",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=military%20army%20songs%20march%20red%20star%20uniform&image_size=square_hd",
    description: "铁血军魂 · 嘹亮战歌",
    keyword: "军旅 军歌",
    accent: "#B91C1C",
  },
  {
    id: "pa_red",
    name: "红色歌单",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=red%20song%20china%20flag%20patriotic%20golden%20star&image_size=square_hd",
    description: "红色经典 · 峥嵘岁月",
    keyword: "红歌 爱国",
    accent: "#DC2626",
  },
  {
    id: "pa_spring_gala",
    name: "春晚新歌",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spring%20festival%20gala%20chinese%20new%20year%20red%20lantern%20celebration&image_size=square_hd",
    description: "春晚舞台 · 经典再现",
    keyword: "春晚 春节",
    accent: "#E11D48",
  },
  {
    id: "pa_new_release",
    name: "上新歌单",
    cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=new%20music%20release%20fresh%20blue%20neon%20modern&image_size=square_hd",
    description: "最新上线 · 抢先畅听",
    keyword: "新歌 最新",
    accent: "#2563EB",
  },
];

/** 根据歌单专辑 ID 拿到对应的预置元数据 */
export function getPlaylistAlbumById(id: string): PlaylistAlbum | null {
  return PLAYLIST_ALBUMS.find((p) => p.id === id) || null;
}

/** 拉取歌单专辑下的歌曲（30 首） */
export async function getPlaylistAlbumSongs(id: string): Promise<SearchResult[]> {
  const album = getPlaylistAlbumById(id);
  if (!album) return [];
  return searchSongs(album.keyword, 30);
}


export interface Artist {
  id: string;
  name: string;
  avatar: string;
  songCount: number;
  albumCount: number;
  description?: string;
}

export interface HotArtist {
  /** 1-based 周榜名次 */
  rank: number;
  artist: Artist;
  /** 本周热度值（播放/收藏/分享加权） */
  weeklyHeat: number;
  /** 相比上周趋势 */
  weeklyTrend: "up" | "down" | "stable";
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  cover: string;
  releaseDate: string;
  songCount: number;
  description?: string;
}

export interface PlaylistBrief {
  id: string;
  name: string;
  cover: string;
  creator: string;
  playCount: number;
  songCount: number;
  description?: string;
}

export interface HotKeyword {
  rank: number;
  text: string;
  heat: number;
}

export interface SearchSuggestion {
  text: string;
  type: "song" | "artist" | "album" | "playlist" | "keyword";
}

// 模拟热门搜索词（PRD 3.3.1）
const HOT_KEYWORDS: HotKeyword[] = [
  { rank: 1, text: "周杰伦", heat: 9856231 },
  { rank: 2, text: "林俊杰", heat: 8423156 },
  { rank: 3, text: "邓紫棋", heat: 7523891 },
  { rank: 4, text: "陈奕迅", heat: 6832457 },
  { rank: 5, text: "薛之谦", heat: 6128934 },
  { rank: 6, text: "毛不易", heat: 5623471 },
  { rank: 7, text: "李荣浩", heat: 4987621 },
  { rank: 8, text: "周深", heat: 4523867 },
  { rank: 9, text: "张学友", heat: 4231985 },
  { rank: 10, text: "王力宏", heat: 3847291 },
];

/**
 * 获取热门搜索词 - PRD 3.3.4 /api/search/hot
 */
export async function getHotKeywords(): Promise<HotKeyword[]> {
  return HOT_KEYWORDS;
}

// 模拟歌手/专辑/歌单数据
const MOCK_ARTISTS: Artist[] = [
  { id: "ar1", name: "周杰伦", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20male%20singer%20cool%20portrait%20dark&image_size=square", songCount: 312, albumCount: 15 },
  { id: "ar2", name: "林俊杰", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=asian%20male%20singer%20warm%20portrait&image_size=square", songCount: 268, albumCount: 13 },
  { id: "ar3", name: "陈奕迅", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hongkong%20singer%20portrait%20vintage&image_size=square", songCount: 425, albumCount: 22 },
  { id: "ar4", name: "李荣浩", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20male%20singer%20simple%20style%20portrait&image_size=square", songCount: 156, albumCount: 7 },
  { id: "ar5", name: "周深", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20male%20singer%20pure%20voice%20soft%20portrait&image_size=square", songCount: 198, albumCount: 9 },
  { id: "ar6", name: "邓紫棋", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20female%20singer%20powerful%20portrait&image_size=square", songCount: 234, albumCount: 11 },
  { id: "ar7", name: "薛之谦", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20male%20singer%20moody%20portrait&image_size=square", songCount: 187, albumCount: 8 },
  { id: "ar8", name: "毛不易", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20male%20singer%20folk%20portrait&image_size=square", songCount: 134, albumCount: 6 },
  { id: "ar9", name: "张学友", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hongkong%20legendary%20singer%20portrait%20classic&image_size=square", songCount: 389, albumCount: 18 },
  { id: "ar10", name: "王力宏", avatar: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=asian%20male%20singer%20talented%20portrait&image_size=square", songCount: 276, albumCount: 12 },
];

const MOCK_ALBUMS: Album[] = [
  { id: "al1", name: "七里香", artist: "周杰伦", artistId: "ar1", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=qili%20xiang%20album%20cover%20summer%20fragrance%20green&image_size=square", releaseDate: "2004-08-03", songCount: 10 },
  { id: "al2", name: "十一月的萧邦", artist: "周杰伦", artistId: "ar1", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chopin%20november%20album%20cover%20romantic%20purple&image_size=square", releaseDate: "2005-11-01", songCount: 12 },
  { id: "al3", name: "江南", artist: "林俊杰", artistId: "ar2", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=jiangnan%20album%20cover%20chinese%20river%20south%20blue&image_size=square", releaseDate: "2004-06-04", songCount: 11 },
  { id: "al4", name: "认了吧", artist: "陈奕迅", artistId: "ar3", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=eason%20chan%20album%20cover%20dark%20red&image_size=square", releaseDate: "2007-04-01", songCount: 10 },
  { id: "al5", name: "有理想", artist: "李荣浩", artistId: "ar4", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ideal%20album%20cover%20warm%20orange%20simple&image_size=square", releaseDate: "2016-01-22", songCount: 10 },
  { id: "al6", name: "大鱼", artist: "周深", artistId: "ar5", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=big%20fish%20album%20cover%20ocean%20blue%20dream&image_size=square", releaseDate: "2016-05-20", songCount: 8 },
];

const MOCK_PLAYLISTS: PlaylistBrief[] = [
  { id: "pl1", name: "华语经典老歌", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20classic%20songs%20nostalgic%20warm%20amber&image_size=square", creator: "音乐君", playCount: 12500000, songCount: 80 },
  { id: "pl2", name: "夜晚助眠轻音乐", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sleep%20calm%20music%20night%20purple%20stars&image_size=square", creator: "助眠馆", playCount: 8932000, songCount: 50 },
  { id: "pl3", name: "运动健身燃脂", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sport%20workout%20music%20energetic%20red%20fire&image_size=square", creator: "健身宝", playCount: 7234000, songCount: 60 },
  { id: "pl4", name: "学习工作背景音", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=study%20focus%20music%20lofi%20cozy%20desk%20warm&image_size=square", creator: "专注力", playCount: 6512000, songCount: 40 },
  { id: "pl5", name: "开车兜风必备", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=driving%20road%20music%20open%20sky%20freedom%20blue&image_size=square", creator: "司机老王", playCount: 5421000, songCount: 70 },
  { id: "pl6", name: "怀旧 80 后金曲", cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=80s%20nostalgia%20hits%20retro%20vintage%20vinyl%20warm&image_size=square", creator: "经典电台", playCount: 4893000, songCount: 90 },
];

/**
 * 联想词搜索 - PRD 3.3.4 /api/search/suggest
 * 防抖 300ms 后调用
 */
export async function getSearchSuggestions(keyword: string): Promise<SearchSuggestion[]> {
  if (!keyword.trim()) return [];
  const kw = keyword.toLowerCase().trim();
  const results: SearchSuggestion[] = [];

  // 匹配歌手
  MOCK_ARTISTS.forEach((a) => {
    if (a.name.toLowerCase().includes(kw) || kw.includes(a.name.toLowerCase())) {
      results.push({ text: a.name, type: "artist" });
    }
  });

  // 匹配专辑
  MOCK_ALBUMS.forEach((a) => {
    if (a.name.toLowerCase().includes(kw) || kw.includes(a.name.toLowerCase())) {
      results.push({ text: a.name, type: "album" });
    }
  });

  // 匹配歌单
  MOCK_PLAYLISTS.forEach((p) => {
    if (p.name.toLowerCase().includes(kw) || kw.includes(p.name.toLowerCase())) {
      results.push({ text: p.name, type: "playlist" });
    }
  });

  // 尝试从歌曲搜索 API 拿联想
  try {
    const songs = await searchSongs(keyword, 5);
    songs.forEach((s) => {
      if (!results.find((r) => r.text === s.name)) {
        results.push({ text: s.name, type: "song" });
      }
    });
  } catch {
    /* ignore */
  }

  return results.slice(0, 8);
}

/**
 * 搜索歌手 - PRD 3.3.4 /api/search?type=artist
 */
export async function searchArtists(keyword: string): Promise<Artist[]> {
  if (!keyword.trim()) return [];
  const kw = keyword.toLowerCase().trim();
  return MOCK_ARTISTS.filter((a) => a.name.toLowerCase().includes(kw));
}

/**
 * 搜索专辑 - PRD 3.3.4 /api/search?type=album
 */
export async function searchAlbums(keyword: string): Promise<Album[]> {
  if (!keyword.trim()) return [];
  const kw = keyword.toLowerCase().trim();
  return MOCK_ALBUMS.filter(
    (a) =>
      a.name.toLowerCase().includes(kw) ||
      a.artist.toLowerCase().includes(kw)
  );
}

/**
 * 搜索歌单 - PRD 3.3.4 /api/search?type=playlist
 */
export async function searchPlaylists(keyword: string): Promise<PlaylistBrief[]> {
  if (!keyword.trim()) return [];
  const kw = keyword.toLowerCase().trim();
  return MOCK_PLAYLISTS.filter(
    (p) => p.name.toLowerCase().includes(kw) || p.creator.toLowerCase().includes(kw)
  );
}

/**
 * 乐库分类歌曲 - PRD 3.3.4 /api/library/category
 */
export async function getLibraryCategorySongs(
  categoryId: string,
  page: number = 1,
  size: number = 20
): Promise<SearchResult[]> {
  // 复用 search API，通过关键词模拟
  const keywords: Record<string, string[]> = {
    ancient: ["古风", "国风", "戏腔"],
    pop: ["流行", "华语", "新歌"],
    folk: ["民谣", "李健", "海来阿木"],
    rock: ["摇滚", "汪峰", "痛仰"],
    hiphop: ["说唱", "GAI", "宝石Gem"],
    electronic: ["电子", "Alan Walker"],
    rnb: ["R&B", "陶喆", "方大同"],
    classical: ["古典", "钢琴", "交响"],
  };
  const kws = keywords[categoryId] || ["热门"];
  const offset = (page - 1) * size;
  const keyword = kws[(page - 1) % kws.length];
  const all = await searchSongs(keyword, size + offset);
  return all.slice(offset, offset + size);
}

/**
 * 乐库排行榜 - PRD 3.3.4 /api/library/ranking
 * (复用 getChartSongs)
 */
export async function getLibraryRankingSongs(
  rankingId: string,
  keyword?: string,
  limit: number = 20
): Promise<ChartSong[]> {
  return getChartSongs(rankingId, limit, keyword);
}

/**
 * 获取歌手详情
 */
export async function getArtistDetail(artistId: string): Promise<Artist | null> {
  return MOCK_ARTISTS.find((a) => a.id === artistId) || null;
}

/**
 * 获取本周最热歌手 - PRD 3.3.1 拓展
 * 实际项目应从后端 /api/artist/hot?period=week 获取
 */
export async function getHotArtists(limit: number = 10): Promise<HotArtist[]> {
  // 模拟本周热度数据（key: artistId）
  const heatMap: Record<string, { heat: number; trend: HotArtist["weeklyTrend"] }> = {
    ar1: { heat: 9826547, trend: "up" }, // 周杰伦
    ar2: { heat: 8745231, trend: "stable" }, // 林俊杰
    ar3: { heat: 7623478, trend: "up" }, // 陈奕迅
    ar6: { heat: 6984521, trend: "up" }, // 邓紫棋
    ar5: { heat: 6234789, trend: "down" }, // 周深
    ar7: { heat: 5872341, trend: "stable" }, // 薛之谦
    ar4: { heat: 4987621, trend: "up" }, // 李荣浩
    ar8: { heat: 4523867, trend: "down" }, // 毛不易
    ar9: { heat: 4231985, trend: "stable" }, // 张学友
    ar10: { heat: 3847291, trend: "up" }, // 王力宏
  };

  return MOCK_ARTISTS.filter((a) => heatMap[a.id])
    .sort((a, b) => (heatMap[b.id]?.heat ?? 0) - (heatMap[a.id]?.heat ?? 0))
    .slice(0, limit)
    .map((a, i) => ({
      rank: i + 1,
      artist: a,
      weeklyHeat: heatMap[a.id]?.heat ?? 0,
      weeklyTrend: heatMap[a.id]?.trend ?? "stable",
    }));
}

/**
 * 获取专辑详情
 */
export async function getAlbumDetail(albumId: string): Promise<Album | null> {
  return MOCK_ALBUMS.find((a) => a.id === albumId) || null;
}

/**
 * 获取歌单详情
 */
export async function getPlaylistBriefDetail(playlistId: string): Promise<PlaylistBrief | null> {
  return MOCK_PLAYLISTS.find((p) => p.id === playlistId) || null;
}

/**
 * 筛选+排序歌曲（前端实现）- PRD 3.3.2
 */
export interface SongFilter {
  genre?: string; // 流派
  language?: string; // 语种
}
export interface SongSort {
  by: "default" | "heat" | "newest";
}

export function filterAndSortSongs(
  songs: SearchResult[],
  filter: SongFilter,
  sort: SongSort,
  genreKeywords: Record<string, string[]>,
  languageKeywords: Record<string, string[]>
): SearchResult[] {
  let result = [...songs];

  // 流派筛选
  if (filter.genre && genreKeywords[filter.genre]) {
    const kws = genreKeywords[filter.genre];
    result = result.filter((s) =>
      kws.some((k) => s.name.includes(k) || s.artists.includes(k))
    );
  }

  // 语种筛选（这里基于歌名/歌手名做粗略判断，无法精确）
  if (filter.language && languageKeywords[filter.language]) {
    const kws = languageKeywords[filter.language];
    if (kws.length > 0) {
      result = result.filter((s) =>
        kws.some((k) => s.name.includes(k) || s.artists.includes(k))
      );
    }
  }

  // 排序
  if (sort.by === "heat") {
    // API 返回顺序即相关性/热度顺序，保持原序
  } else if (sort.by === "newest") {
    // 简单倒序
    result = [...result].reverse();
  }

  return result;
}

// 流派关键词映射 - PRD 3.3.2
export const GENRE_KEYWORDS: Record<string, string[]> = {
  pop: ["流行", "pop", "周杰伦", "林俊杰", "邓紫棋"],
  rock: ["摇滚", "rock", "汪峰", "痛仰", "新裤子"],
  classical: ["古典", "classical", "钢琴", "交响", "久石让"],
  electronic: ["电子", "electronic", "Alan Walker", "EDM"],
  hiphop: ["说唱", "hiphop", "rap", "GAI", "宝石Gem"],
  rnb: ["R&B", "rnb", "陶喆", "方大同", "袁娅维"],
};

// 语种关键词映射 - PRD 3.3.2
export const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  zh: ["周杰伦", "林俊杰", "邓紫棋", "陈奕迅", "李荣浩", "周深", "薛之谦", "毛不易"],
  en: ["Adele", "Taylor", "Ed Sheeran", "Justin", "Bieber", "Coldplay"],
  ja: ["久石让", "YOASOBI", "米津", "LiSA", "Aimer"],
  ko: ["BTS", "BLACKPINK", "IU", "TWICE", "EXO"],
};

// ============================================
// 模块 6：个性化推荐 (PRD 3.6)
// 由于前端无后端支持，所有推荐均在前端基于本地数据 +
// 复用 searchSongs 拉取真实候选曲目，并按 PRD 3.6.2 算法权重排序
// ============================================

import type { RecommendPlaylist, FmSong, PreferenceTag } from "../types";

/** 偏好关键字 → 搜索词映射（让"主动偏好"权重生效） */
export const PREFERENCE_KEYWORDS: Record<PreferenceTag, string[]> = {
  "古风": ["古风", "国风", "周深", "刘珂矣"],
  "流行": ["流行", "周杰伦", "李荣浩"],
  "民谣": ["民谣", "李健", "海来阿木"],
  "摇滚": ["摇滚", "汪峰"],
  "说唱": ["说唱", "宝石Gem", "嘻哈"],
  "电子": ["电子", "电音"],
  "R&B": ["R&B", "蓝调", "灵魂"],
  "古典": ["古典", "钢琴", "交响"],
  "轻音乐": ["轻音乐", "钢琴曲"],
  "治愈": ["治愈", "温暖"],
  "伤感": ["伤感", "情歌"],
  "运动": ["运动", "跑步", "节拍"],
  "通勤": ["通勤", "流行"],
  "学习": ["学习", "纯音乐"],
  "睡前": ["睡前", "轻音乐", "白噪音"],
  "K歌": ["热门", "KTV", "经典"],
};

/** 模拟拉取候选歌曲（复用 searchSongs） */
async function fetchCandidateSongs(keywords: string[], limit: number = 30): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  for (const kw of keywords) {
    try {
      const r = await searchSongs(kw, Math.max(1, Math.ceil(limit / Math.max(1, keywords.length))));
      results.push(...r);
    } catch {
      /* ignore single failure */
    }
    if (results.length >= limit) break;
  }
  // 去重 + 截断
  const seen = new Set<number>();
  return results
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .slice(0, limit);
}

/**
 * 每日推荐 - PRD 3.6.3 GET /api/recommend/daily
 * 基于播放历史 40% + 收藏 30% + 搜索 15% + 主动偏好 15% 综合排序
 */
export async function getDailyRecommend(options: {
  historyKeywords: string[];
  favoriteKeywords: string[];
  searchKeywords: string[];
  preferences: PreferenceTag[];
  limit?: number;
}): Promise<SearchResult[]> {
  const { historyKeywords, favoriteKeywords, searchKeywords, preferences } = options;
  const limit = options.limit ?? 30;

  // 拼装关键词
  const historyPool = historyKeywords.length > 0 ? historyKeywords : ["流行", "热门"];
  const favoritePool = favoriteKeywords.length > 0 ? favoriteKeywords : historyPool;
  const searchPool = searchKeywords.length > 0 ? searchKeywords : historyPool;
  const prefKeywords = preferences.flatMap((p) => PREFERENCE_KEYWORDS[p] || []);

  // 各源拉取数量（粗略按权重比例）
  const histCount = Math.ceil(limit * 0.4) + 6;
  const favCount = Math.ceil(limit * 0.3) + 4;
  const searchCount = Math.ceil(limit * 0.15) + 2;
  const prefCount = Math.ceil(limit * 0.15) + 2;

  const [histSongs, favSongs, searchSongsRes, prefSongs] = await Promise.all([
    fetchCandidateSongs(historyPool.slice(0, 4), histCount),
    fetchCandidateSongs(favoritePool.slice(0, 4), favCount),
    fetchCandidateSongs(searchPool.slice(0, 3), searchCount),
    prefKeywords.length > 0
      ? fetchCandidateSongs(prefKeywords.slice(0, 4), prefCount)
      : Promise.resolve([] as SearchResult[]),
  ]);

  // 合并 + 加权打分
  const score = new Map<number, number>();
  const map = new Map<number, SearchResult>();

  const add = (arr: SearchResult[], weight: number) => {
    arr.forEach((s, i) => {
      const decay = 1 - (i / Math.max(1, arr.length)) * 0.5; // 越靠前权重越高
      const cur = score.get(s.id) || 0;
      score.set(s.id, cur + weight * decay);
      if (!map.has(s.id)) map.set(s.id, s);
    });
  };

  add(histSongs, 0.4);
  add(favSongs, 0.3);
  add(searchSongsRes, 0.15);
  add(prefSongs, 0.15);

  return Array.from(map.values())
    .sort((a, b) => (score.get(b.id) || 0) - (score.get(a.id) || 0))
    .slice(0, limit);
}

/**
 * 私人 FM - PRD 3.6.3 GET /api/recommend/fm
 * 实时拉取单首，权重与日推一致，但每次只返回一首
 */
export async function getFmSong(options: {
  historyKeywords: string[];
  favoriteKeywords: string[];
  preferences: PreferenceTag[];
  excludeIds: number[];
}): Promise<FmSong | null> {
  const { historyKeywords, favoriteKeywords, preferences, excludeIds } = options;
  const exclude = new Set(excludeIds);

  // 轮盘赌权重选择来源
  const sources: Array<{
    weight: number;
    keywords: string[];
    source: FmSong["source"];
    reason: string;
  }> = [
    { weight: 0.4, keywords: historyKeywords, source: "history", reason: "根据你最近常听的歌曲推荐" },
    { weight: 0.3, keywords: favoriteKeywords, source: "favorite", reason: "和你喜欢的歌风格相似" },
    {
      weight: 0.15,
      keywords: preferences.flatMap((p) => PREFERENCE_KEYWORDS[p] || []),
      source: "preference",
      reason: "基于你的偏好标签",
    },
    { weight: 0.15, keywords: historyKeywords, source: "search", reason: "可能也合你口味" },
  ];

  const total = sources.reduce((s, x) => s + x.weight, 0);
  let pick = Math.random() * total;
  let chosen = sources[sources.length - 1];
  for (const s of sources) {
    pick -= s.weight;
    if (pick <= 0) {
      chosen = s;
      break;
    }
  }

  const kws = chosen.keywords.length > 0 ? chosen.keywords : ["热门", "流行"];
  const candidates = await fetchCandidateSongs(kws.slice(0, 4), 10);
  const filtered = candidates.filter((c) => !exclude.has(c.id));
  if (filtered.length === 0) return null;
  const pickSong = filtered[Math.floor(Math.random() * filtered.length)];

  return {
    id: pickSong.id,
    title: pickSong.name,
    artist: pickSong.artists,
    cover: pickSong.picUrl || "",
    src: "",
    duration: pickSong.duration ? pickSong.duration / 1000 : 0,
    neteaseId: pickSong.id,
    isLoading: false,
    isFavorite: false,
    source: chosen.source,
    reason: chosen.reason,
  };
}

/**
 * 猜你喜欢 - PRD 3.6.3 GET /api/recommend/guess
 * 返回歌单/专辑卡片
 */
export async function getGuessYouLike(options: {
  historyKeywords: string[];
  favoriteKeywords: string[];
  preferences: PreferenceTag[];
  page: number;
  size: number;
}): Promise<RecommendPlaylist[]> {
  const { historyKeywords, favoriteKeywords, preferences, page, size } = options;

  // 拼出主题关键词
  const themePool: string[] = [];
  if (historyKeywords.length > 0) themePool.push(...historyKeywords.slice(0, 3));
  if (favoriteKeywords.length > 0) themePool.push(...favoriteKeywords.slice(0, 3));
  preferences.forEach((p) => {
    PREFERENCE_KEYWORDS[p]?.slice(0, 2).forEach((k) => themePool.push(k));
  });
  if (themePool.length === 0) themePool.push("热门", "流行", "古风", "民谣");

  // 拉取候选歌曲，然后按"主题聚合"成虚拟歌单
  const candidates = await fetchCandidateSongs(themePool, Math.min(50, (page + 1) * size * 2));

  // 按歌手聚合
  const groups = new Map<string, SearchResult[]>();
  candidates.forEach((s) => {
    const artistKey = s.artists.split(/[、,/]/)[0]?.trim() || "群星";
    if (!groups.has(artistKey)) groups.set(artistKey, []);
    groups.get(artistKey)!.push(s);
  });

  // 固定热门主题歌单（冷启动兜底）
  const fixedSeeds: Array<Omit<RecommendPlaylist, "score">> = [
    {
      id: "rec_hot_top",
      name: "热歌风向标",
      type: "playlist",
      cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hot%20music%20chart%20fire%20neon%20orange&image_size=square_hd",
      description: "当下最热的 30 首",
      creator: "聆音推荐",
      playCount: 12580000,
      songCount: 30,
      accent: "#F97316",
      reason: "基于本周热度",
    },
    {
      id: "rec_chinese",
      name: "国韵心声 · 古风雅集",
      type: "playlist",
      cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20ancient%20ink%20painting%20moon%20elegant&image_size=square_hd",
      description: "古风与国韵精选",
      creator: "聆音推荐",
      playCount: 8320000,
      songCount: 28,
      accent: "#A855F7",
      reason: "国风爱好者常听",
    },
    {
      id: "rec_folk",
      name: "民谣与诗 · 治愈时分",
      type: "playlist",
      cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=folk%20acoustic%20warm%20campfire%20sunset&image_size=square_hd",
      description: "诗与远方的民谣",
      creator: "聆音推荐",
      playCount: 5210000,
      songCount: 24,
      accent: "#22C55E",
      reason: "民谣标签用户收藏多",
    },
    {
      id: "rec_electronic",
      name: "电子律动 · 深夜驾驶",
      type: "playlist",
      cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=synthwave%20electronic%20neon%20city%20night&image_size=square_hd",
      description: "Synthwave 与 City Pop",
      creator: "聆音推荐",
      playCount: 4480000,
      songCount: 22,
      accent: "#06B6D4",
      reason: "电子乐偏好",
    },
    {
      id: "rec_rnb",
      name: "R&B 慵懒周末",
      type: "playlist",
      cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rnb%20jazz%20vintage%20lounge%20warm%20lights&image_size=square_hd",
      description: "灵魂律动的慵懒午后",
      creator: "聆音推荐",
      playCount: 3660000,
      songCount: 20,
      accent: "#EC4899",
      reason: "R&B 偏好",
    },
    {
      id: "rec_rock",
      name: "摇滚狂潮 · 释放自我",
      type: "playlist",
      cover: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rock%20electric%20guitar%20fire%20stage%20dark&image_size=square_hd",
      description: "热血澎湃的摇滚",
      creator: "聆音推荐",
      playCount: 2910000,
      songCount: 25,
      accent: "#EF4444",
      reason: "摇滚偏好",
    },
  ];

  const recs: RecommendPlaylist[] = fixedSeeds.map((s, i) => ({
    ...s,
    score: 1 - i * 0.05,
  }));

  // 动态生成"猜你喜欢"歌单（按歌手聚合）
  const dynamicSeeds: RecommendPlaylist[] = [];
  let rank = 0;
  for (const [artist, songs] of groups.entries()) {
    if (songs.length < 2 || rank >= 6) continue;
    const sample = songs[0];
    const palette = ["#7c3aed", "#06b6d4", "#f59e0b", "#ec4899", "#22c55e", "#0ea5e9", "#a855f7"];
    dynamicSeeds.push({
      id: `rec_artist_${artist}`,
      name: `${artist} · 热门金曲`,
      type: "playlist",
      cover:
        sample.picUrl ||
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=music%20album%20cover%20gradient&image_size=square_hd",
      description: `${artist} 热门歌曲合辑`,
      creator: "聆音推荐",
      playCount: Math.floor(500000 + Math.random() * 5000000),
      songCount: songs.length,
      accent: palette[rank % palette.length],
      reason: `你常听 ${artist}`,
      score: 0.9 - rank * 0.05,
    });
    rank++;
  }

  const all = [...dynamicSeeds, ...recs];
  all.sort((a, b) => b.score - a.score);

  // 分页
  const start = (page - 1) * size;
  return all.slice(start, start + size);
}
