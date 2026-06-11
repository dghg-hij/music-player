/**
 * 歌曲模块前端 API 服务 — 对应接口文档第 6 章
 *
 * 接口列表：
 *   GET  /api/song/play-url    — 获取播放地址（需鉴权）
 *   GET  /api/song/lyrics      — 获取歌词（公开）
 *   GET  /api/song/detail      — 获取歌曲详情（公开）
 *   POST /api/song/play-report — 播放上报（需鉴权）
 *
 * 当 API_MODE=remote 时通过 apiClient 调用真实后端；
 * 否则回退到 musicApi.ts 中的网易云代理逻辑。
 */

import {
  useRemoteApi,
  apiClient,
  SONG_ENDPOINTS,
  apiCache,
  MemoryCache,
} from "./apiClient";
import { getSongUrl, getSongLyric } from "./musicApi";
import type { AudioQuality } from "../types";

// ---- 响应类型 ----

/** 播放地址响应 — 6.1 */
export interface PlayUrlResponse {
  url: string;
  quality: string;
}

/** 歌词响应 — 6.2 */
export interface LyricsResponse {
  lyrics: string;
  translation: string;
}

/** 歌曲详情响应 — 6.3 */
export interface SongDetailResponse {
  id: number;
  title: string;
  artistId: string;
  albumId: string;
  duration: number;
  cover: string;
  isPaid: number;
  heat: number;
  genre: string;
  language: string;
}

/** 播放上报请求 — 6.4 */
export interface PlayReportPayload {
  songId: number;
  playTime?: number;
  progress?: number;
  device?: string;
  quality?: string;
}

// ---- API 方法 ----

/**
 * 获取播放地址 — GET /api/song/play-url
 * 远程模式调用后端；本地模式回退到网易云代理
 */
export async function getPlayUrl(
  songId: number,
  quality: AudioQuality = "lossless"
): Promise<PlayUrlResponse | null> {
  if (useRemoteApi()) {
    const res = await apiClient.get<PlayUrlResponse>(
      SONG_ENDPOINTS.PLAY_URL,
      { songId, quality },
      { skipCache: true } // 播放地址不缓存（带时效签名）
    );
    if (res.code === 200 && res.data) return res.data;
    return null;
  }

  // 本地模式：回退到网易云代理
  const url = await getSongUrl(songId, quality);
  if (!url) return null;
  return { url, quality };
}

/**
 * 获取歌词 — GET /api/song/lyrics
 * 远程模式调用后端；本地模式回退到网易云代理
 */
export async function getLyrics(songId: number): Promise<LyricsResponse | null> {
  if (useRemoteApi()) {
    const cacheKey = MemoryCache.makeKey("song:lyrics", songId);
    const res = await apiClient.get<LyricsResponse>(
      SONG_ENDPOINTS.LYRICS,
      { songId },
      { cacheKey }
    );
    if (res.code === 200 && res.data) return res.data;
    return null;
  }

  // 本地模式：回退到网易云代理（仅返回原文，无翻译）
  const lrc = await getSongLyric(songId);
  return { lyrics: lrc, translation: "" };
}

/**
 * 获取歌曲详情 — GET /api/song/detail
 * 远程模式调用后端；本地模式返回 null（由 musicApi 的搜索结果替代）
 */
export async function getSongDetail(songId: number): Promise<SongDetailResponse | null> {
  if (useRemoteApi()) {
    const cacheKey = MemoryCache.makeKey("song:detail", songId);
    const res = await apiClient.get<SongDetailResponse>(
      SONG_ENDPOINTS.DETAIL,
      { songId },
      { cacheKey }
    );
    if (res.code === 200 && res.data) return res.data;
    return null;
  }

  // 本地模式：无独立详情接口，由调用方从搜索结果中获取
  return null;
}

/**
 * 播放上报 — POST /api/song/play-report
 * 远程模式调用后端；本地模式仅 console 输出
 */
export async function reportPlay(payload: PlayReportPayload): Promise<boolean> {
  if (useRemoteApi()) {
    const res = await apiClient.post<null>(
      SONG_ENDPOINTS.PLAY_REPORT,
      payload
    );
    return res.code === 200;
  }

  // 本地模式：模拟上报
  console.log("[SongApi:PlayReport]", payload);
  return true;
}
