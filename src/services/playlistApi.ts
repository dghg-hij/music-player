/**
 * 模拟后端歌单管理 API
 *
 * 对应 PRD 3.4.5 / 4.3.5 / 4.3.7 的接口契约：
 *   POST   /api/playlist/create
 *   DELETE /api/playlist/{id}
 *   PUT    /api/playlist/{id}
 *   GET    /api/playlist/{id}
 *   POST   /api/playlist/{id}/songs
 *   DELETE /api/playlist/{id}/songs
 *   PUT    /api/playlist/{id}/sort
 *   POST   /api/playlist/{id}/collect
 *   DELETE /api/playlist/{id}/collect
 *
 * 实现策略：
 *   - 没有真实后端时，调用方（playerStore）直接更新本地数据；本文件保留
 *     一份独立的模拟服务，方便将来切换到真实后端时只改 store 的调用方。
 *   - 数据落地用 sessionStorage，与 store 的 localStorage 解耦。
 *   - 所有方法均返回 Promise 模拟异步，便于将来替换为 fetch。
 *   - PRD 4 后端整体设计：当 API_MODE=remote 时，通过 apiClient 调用真实后端。
 */

import type { Playlist } from "../types";
import {
  useRemoteApi,
  apiClient,
  PLAYLIST_ENDPOINTS,
} from "./apiClient";

const STORAGE_KEY = "playlist-api-mock";

type Store = Record<string, Playlist>;

function readStore(): Store {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 静默失败
  }
}

/** 模拟 50~150ms 网络延迟 */
function delay<T>(value: T, ms = 80 + Math.random() * 70): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** POST /api/playlist/create */
export async function createPlaylistRemote(payload: {
  name: string;
  cover?: string;
  description?: string;
  creatorUid?: string;
  creatorName?: string;
}): Promise<{ playlistId: string }> {
  if (useRemoteApi()) {
    const res = await apiClient.post<{ playlistId: string }>("/playlist/create", payload);
    if (res.code === 200 && res.data) return res.data;
  }
  const id = `pl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = Date.now();
  const playlist: Playlist = {
    id,
    name: payload.name,
    songIds: [],
    cover: payload.cover,
    description: payload.description,
    creatorUid: payload.creatorUid,
    creatorName: payload.creatorName,
    createdAt: now,
    updatedAt: now,
    isCollected: false,
    source: "created",
    playCount: 0,
  };
  const store = readStore();
  store[id] = playlist;
  writeStore(store);
  return delay({ playlistId: id });
}

/** DELETE /api/playlist/{id} - 仅创建者可删 */
export async function deletePlaylistRemote(playlistId: string): Promise<{ success: boolean }> {
  if (useRemoteApi()) {
    const res = await apiClient.delete<null>(`/playlist/${playlistId}`);
    return { success: res.code === 200 };
  }
  const store = readStore();
  delete store[playlistId];
  writeStore(store);
  return delay({ success: true });
}

/** PUT /api/playlist/{id} */
export async function updatePlaylistRemote(
  playlistId: string,
  patch: { name?: string; cover?: string; description?: string }
): Promise<{ success: boolean }> {
  if (useRemoteApi()) {
    const res = await apiClient.put<null>(`/playlist/${playlistId}`, patch);
    return { success: res.code === 200 };
  }
  const store = readStore();
  if (store[playlistId]) {
    store[playlistId] = {
      ...store[playlistId],
      ...patch,
      updatedAt: Date.now(),
    };
    writeStore(store);
    return delay({ success: true });
  }
  return delay({ success: false }, 50);
}

/** GET /api/playlist/{id} */
export async function getPlaylistRemote(playlistId: string): Promise<Playlist | null> {
  const store = readStore();
  return delay(store[playlistId] ?? null);
}

/** POST /api/playlist/{id}/songs - 返回 added/duplicated 区分 */
export async function addSongsRemote(
  playlistId: string,
  songIds: number[]
): Promise<{ added: number[]; duplicated: number[] }> {
  const store = readStore();
  const playlist = store[playlistId];
  if (!playlist) return delay({ added: [], duplicated: songIds });
  const set = new Set(playlist.songIds);
  const added: number[] = [];
  const duplicated: number[] = [];
  for (const id of songIds) {
    if (set.has(id)) duplicated.push(id);
    else {
      added.push(id);
      set.add(id);
    }
  }
  store[playlistId] = { ...playlist, songIds: Array.from(set), updatedAt: Date.now() };
  writeStore(store);
  return delay({ added, duplicated });
}

/** DELETE /api/playlist/{id}/songs */
export async function removeSongsRemote(
  playlistId: string,
  songIds: number[]
): Promise<{ success: boolean }> {
  const store = readStore();
  const playlist = store[playlistId];
  if (!playlist) return delay({ success: false });
  const removeSet = new Set(songIds);
  store[playlistId] = {
    ...playlist,
    songIds: playlist.songIds.filter((id) => !removeSet.has(id)),
    updatedAt: Date.now(),
  };
  writeStore(store);
  return delay({ success: true });
}

/** PUT /api/playlist/{id}/sort */
export async function sortPlaylistRemote(
  playlistId: string,
  songIdOrders: number[]
): Promise<{ success: boolean }> {
  const store = readStore();
  const playlist = store[playlistId];
  if (!playlist) return delay({ success: false });
  // 校验：必须是原歌单歌曲的排列
  const original = new Set(playlist.songIds);
  if (songIdOrders.length !== playlist.songIds.length || !songIdOrders.every((id) => original.has(id))) {
    return delay({ success: false });
  }
  store[playlistId] = { ...playlist, songIds: songIdOrders, updatedAt: Date.now() };
  writeStore(store);
  return delay({ success: true });
}

/** POST /api/playlist/{id}/collect */
export async function collectPlaylistRemote(playlistId: string): Promise<{ success: boolean }> {
  if (useRemoteApi()) {
    const res = await apiClient.post<null>(`/playlist/${playlistId}/collect`);
    return { success: res.code === 200 };
  }
  const store = readStore();
  if (store[playlistId]) {
    store[playlistId] = { ...store[playlistId], isCollected: true, updatedAt: Date.now() };
    writeStore(store);
    return delay({ success: true });
  }
  return delay({ success: false });
}

/** DELETE /api/playlist/{id}/collect */
export async function uncollectPlaylistRemote(playlistId: string): Promise<{ success: boolean }> {
  if (useRemoteApi()) {
    const res = await apiClient.delete<null>(`/playlist/${playlistId}/collect`);
    return { success: res.code === 200 };
  }
  const store = readStore();
  if (store[playlistId]) {
    store[playlistId] = { ...store[playlistId], isCollected: false, updatedAt: Date.now() };
    writeStore(store);
    return delay({ success: true });
  }
  return delay({ success: false });
}

/** GET /api/user/playlists - 用于初始化 */
export async function fetchUserPlaylistsRemote(): Promise<{ created: Playlist[]; collected: Playlist[] }> {
  const store = readStore();
  const list = Object.values(store);
  return delay({
    created: list.filter((p) => p.source === "created"),
    collected: list.filter((p) => p.isCollected && p.source !== "created"),
  });
}
