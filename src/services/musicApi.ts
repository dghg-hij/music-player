const API_BASE = import.meta.env.DEV
  ? "/api/163_music"
  : "https://api.bugpk.com/api/163_music";

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `${API_BASE}?type=search&s=${encodeURIComponent(keyword)}&limit=${limit}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const json = await res.json();
    if (json.code === 200 && json.data?.songs) {
      return json.data.songs;
    }
    return [];
  } catch {
    return [];
  }
}

export async function getSongUrl(id: number): Promise<string | null> {
  // 检查缓存
  const cached = urlCache.get(id);
  if (cached && cached.expireAt > Date.now()) {
    return cached.url;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `${API_BASE}?type=url&id=${id}&level=exhigh`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code === 200 && json.data?.[0]?.url) {
      const url = json.data[0].url;
      // 写入缓存
      urlCache.set(id, { url, expireAt: Date.now() + CACHE_TTL });
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSongLyric(id: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `${API_BASE}?type=lyric&id=${id}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
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

// 获取当前周数作为缓存 key
function getWeekKey(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
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

export async function getChartSongs(playlistId: string, limit: number = 20, keyword?: string): Promise<ChartSong[]> {
  // 先查缓存
  const cached = getCachedChart(playlistId);
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

    // 回退到 playlist API（带超时）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `${API_BASE}?type=playlist&id=${playlistId}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return [];
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

    // 回退到 playlist API（带超时）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `${API_BASE}?type=playlist&id=${HOT_CHART_PLAYLIST_ID}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return [];
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
    return [];
  }
}

export interface LyricLine {
  time: number;
  text: string;
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
