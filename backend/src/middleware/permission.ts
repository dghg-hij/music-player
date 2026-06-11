// ============================================================
// 12.5 权限控制中间件
// 对应文档 12.5 权限控制规范
// 资源权限：歌单编辑/删除/添加歌曲/排序 → 仅创建者
// 操作权限：歌单收藏/取消收藏 → 已登录用户
// 付费权限：付费歌曲播放 → 已登录用户
// ============================================================

import { errorResponse } from "../utils";

/** 权限检查结果 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/** 资源类型 */
export type ResourceType = "playlist" | "song";

/** 操作类型 */
export type ActionType =
  | "edit"       // 编辑歌单
  | "delete"     // 删除歌单
  | "add_songs"  // 添加歌曲到歌单
  | "sort"       // 歌曲排序
  | "collect"    // 收藏歌单
  | "uncollect"  // 取消收藏歌单
  | "play"       // 播放歌曲
  | "view"       // 查看资源
  | "manage";    // 管理操作

/**
 * 权限规则定义（对应文档 12.5）
 *
 * | 资源 | 操作 | 权限规则 |
 * |------|------|---------|
 * | 歌单 | 编辑/删除/添加歌曲/排序 | 仅创建者 |
 * | 歌单 | 收藏/取消收藏 | 已登录用户 |
 * | 付费歌曲 | 播放 | 已登录用户 |
 */
const PERMISSION_RULES: Record<string, { requiresAuth: boolean; requiresOwner: boolean }> = {
  "playlist:edit":       { requiresAuth: true, requiresOwner: true },
  "playlist:delete":     { requiresAuth: true, requiresOwner: true },
  "playlist:add_songs":  { requiresAuth: true, requiresOwner: true },
  "playlist:sort":       { requiresAuth: true, requiresOwner: true },
  "playlist:collect":    { requiresAuth: true, requiresOwner: false },
  "playlist:uncollect":  { requiresAuth: true, requiresOwner: false },
  "playlist:view":       { requiresAuth: false, requiresOwner: false },
  "song:play":           { requiresAuth: true, requiresOwner: false },
  "song:view":           { requiresAuth: false, requiresOwner: false },
  "song:lyrics":         { requiresAuth: false, requiresOwner: false },
};

/**
 * 检查权限规则
 * @param resource 资源类型
 * @param action 操作类型
 * @param uid 当前用户 UID（null 表示未登录）
 * @param ownerUid 资源所有者 UID
 */
export function checkPermission(
  resource: ResourceType,
  action: ActionType,
  uid: string | null,
  ownerUid?: string
): PermissionResult {
  const ruleKey = `${resource}:${action}`;
  const rule = PERMISSION_RULES[ruleKey];

  if (!rule) {
    // 未定义的权限规则，默认拒绝
    return { allowed: false, reason: "无权限执行此操作" };
  }

  // 检查是否需要登录
  if (rule.requiresAuth && !uid) {
    return { allowed: false, reason: "未授权，请先登录" };
  }

  // 检查是否需要所有者权限
  if (rule.requiresOwner) {
    if (!ownerUid) {
      return { allowed: false, reason: "无法确定资源所有者" };
    }
    if (uid !== ownerUid) {
      return { allowed: false, reason: "无权操作" };
    }
  }

  return { allowed: true };
}

/**
 * 验证歌单创建者权限
 * 从数据库查询歌单的 creator_uid 并与当前用户比较
 */
export async function verifyPlaylistOwner(
  db: D1Database,
  playlistId: string,
  uid: string
): Promise<{ isOwner: boolean; playlist: Record<string, unknown> | null }> {
  const playlist = await db.prepare(
    "SELECT id, creator_uid, deleted_at FROM t_playlist WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(playlistId)
    .first<Record<string, unknown>>();

  if (!playlist) {
    return { isOwner: false, playlist: null };
  }

  return {
    isOwner: playlist.creator_uid === uid,
    playlist,
  };
}

/**
 * 歌单操作权限守卫
 * 检查用户是否有权操作指定歌单
 */
export async function guardPlaylistAction(
  db: D1Database,
  playlistId: string,
  uid: string,
  action: "edit" | "delete" | "add_songs" | "sort" | "collect" | "uncollect" | "view"
): Promise<{ allowed: boolean; response?: Response; playlist?: Record<string, unknown> }> {
  // 收藏/取消收藏只需登录
  if (action === "collect" || action === "uncollect") {
    const result = checkPermission("playlist", action, uid);
    if (!result.allowed) {
      return { allowed: false, response: errorResponse(401, result.reason!) };
    }
    return { allowed: true };
  }

  // 查看权限
  if (action === "view") {
    return { allowed: true };
  }

  // 编辑/删除/添加歌曲/排序 需要创建者权限
  const { isOwner, playlist } = await verifyPlaylistOwner(db, playlistId, uid);

  if (!playlist) {
    return { allowed: false, response: errorResponse(404, "歌单不存在") };
  }

  const result = checkPermission("playlist", action, uid, playlist.creator_uid as string);
  if (!result.allowed) {
    return { allowed: false, response: errorResponse(403, result.reason!) };
  }

  return { allowed: true, playlist };
}

/**
 * 歌曲播放权限守卫
 * 付费歌曲需要登录，免费歌曲无需登录
 */
export async function guardSongPlay(
  db: D1Database,
  songId: number,
  uid: string | null
): Promise<{ allowed: boolean; response?: Response; song?: Record<string, unknown> }> {
  const song = await db.prepare(
    "SELECT id, is_paid FROM t_song WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(songId)
    .first<Record<string, unknown>>();

  if (!song) {
    return { allowed: false, response: errorResponse(404, "歌曲不存在") };
  }

  // 付费歌曲需要登录
  if (song.is_paid) {
    const result = checkPermission("song", "play", uid);
    if (!result.allowed) {
      return { allowed: false, response: errorResponse(401, result.reason!) };
    }
  }

  return { allowed: true, song };
}
