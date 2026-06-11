import { success, errorResponse, authenticate, parseBody, corsHeaders } from "../utils";

interface Env {
  DB: D1Database;
}

export async function handlePlaylistRoutes(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  const uid = await authenticate(request, env.DB);
  if (!uid) {
    return errorResponse(401, "未授权");
  }

  // POST /api/playlist/create
  if (method === "POST" && path === "/api/playlist/create") {
    const body = await parseBody<{ name: string; cover?: string; description?: string }>(request);
    if (!body.name) {
      return errorResponse(400, "歌单名称不能为空");
    }
    const playlistId = `pl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "INSERT INTO t_playlist (id, name, cover, description, creator_uid, song_count, play_count, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, 1, ?, ?)"
    )
      .bind(playlistId, body.name, body.cover ?? "", body.description ?? "", uid, now, now)
      .run();
    return success({ playlistId });
  }

  // Routes with :id parameter
  const playlistMatch = path.match(/^\/api\/playlist\/([^/]+)(\/.*)?$/);
  if (!playlistMatch) {
    return errorResponse(404, "路由不存在");
  }

  const playlistId = playlistMatch[1];
  const subPath = playlistMatch[2] ?? "";

  // GET /api/playlist/:id
  if (method === "GET" && subPath === "") {
    const playlist = await env.DB.prepare(
      "SELECT id, name, cover, description, creator_uid, song_count, play_count, is_public, created_at, updated_at FROM t_playlist WHERE id = ? AND deleted_at IS NULL"
    )
      .bind(playlistId)
      .first<{
        id: string; name: string; cover: string; description: string;
        creator_uid: string; song_count: number; play_count: number;
        is_public: number; created_at: number; updated_at: number;
      }>();

    if (!playlist) {
      return errorResponse(404, "歌单不存在");
    }

    const songs = await env.DB.prepare(
      "SELECT song_id FROM t_playlist_song WHERE playlist_id = ? ORDER BY sort_order ASC"
    )
      .bind(playlistId)
      .all<{ song_id: number }>();

    const songIds = songs.results.map((r) => r.song_id);
    return success({ ...playlist, songIds });
  }

  // PUT /api/playlist/:id
  if (method === "PUT" && subPath === "") {
    const playlist = await env.DB.prepare(
      "SELECT creator_uid FROM t_playlist WHERE id = ? AND deleted_at IS NULL"
    )
      .bind(playlistId)
      .first<{ creator_uid: string }>();

    if (!playlist) return errorResponse(404, "歌单不存在");
    if (playlist.creator_uid !== uid) return errorResponse(403, "无权操作");

    const body = await parseBody<{ name?: string; cover?: string; description?: string }>(request);
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "UPDATE t_playlist SET name = COALESCE(?, name), cover = COALESCE(?, cover), description = COALESCE(?, description), updated_at = ? WHERE id = ?"
    )
      .bind(body.name ?? null, body.cover ?? null, body.description ?? null, now, playlistId)
      .run();

    return success(null, "更新成功");
  }

  // DELETE /api/playlist/:id
  if (method === "DELETE" && subPath === "") {
    const playlist = await env.DB.prepare(
      "SELECT creator_uid FROM t_playlist WHERE id = ? AND deleted_at IS NULL"
    )
      .bind(playlistId)
      .first<{ creator_uid: string }>();

    if (!playlist) return errorResponse(404, "歌单不存在");
    if (playlist.creator_uid !== uid) return errorResponse(403, "无权操作");

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "UPDATE t_playlist SET deleted_at = ?, updated_at = ? WHERE id = ?"
    )
      .bind(now, now, playlistId)
      .run();

    return success(null, "删除成功");
  }

  // POST /api/playlist/:id/songs
  if (method === "POST" && subPath === "/songs") {
    const body = await parseBody<{ songIds: number[] }>(request);
    if (!body.songIds || !Array.isArray(body.songIds) || body.songIds.length === 0) {
      return errorResponse(400, "songIds 不能为空");
    }

    const added: number[] = [];
    const duplicated: number[] = [];

    for (const songId of body.songIds) {
      const existing = await env.DB.prepare(
        "SELECT id FROM t_playlist_song WHERE playlist_id = ? AND song_id = ?"
      )
        .bind(playlistId, songId)
        .first();

      if (existing) {
        duplicated.push(songId);
      } else {
        const now = Math.floor(Date.now() / 1000);
        const maxSort = await env.DB.prepare(
          "SELECT MAX(sort_order) as max_sort FROM t_playlist_song WHERE playlist_id = ?"
        )
          .bind(playlistId)
          .first<{ max_sort: number | null }>();
        const sortOrder = (maxSort?.max_sort ?? 0) + 1;
        await env.DB.prepare(
          "INSERT INTO t_playlist_song (playlist_id, song_id, sort_order, added_at) VALUES (?, ?, ?, ?)"
        )
          .bind(playlistId, songId, sortOrder, now)
          .run();
        added.push(songId);
      }
    }

    const countResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM t_playlist_song WHERE playlist_id = ?"
    )
      .bind(playlistId)
      .first<{ cnt: number }>();

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "UPDATE t_playlist SET song_count = ?, updated_at = ? WHERE id = ?"
    )
      .bind(countResult!.cnt, now, playlistId)
      .run();

    return success({ added, duplicated });
  }

  // DELETE /api/playlist/:id/songs
  if (method === "DELETE" && subPath === "/songs") {
    const body = await parseBody<{ songIds: number[] }>(request);
    if (!body.songIds || !Array.isArray(body.songIds) || body.songIds.length === 0) {
      return errorResponse(400, "songIds 不能为空");
    }

    const placeholders = body.songIds.map(() => "?").join(",");
    await env.DB.prepare(
      `DELETE FROM t_playlist_song WHERE playlist_id = ? AND song_id IN (${placeholders})`
    )
      .bind(playlistId, ...body.songIds)
      .run();

    const countResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM t_playlist_song WHERE playlist_id = ?"
    )
      .bind(playlistId)
      .first<{ cnt: number }>();

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "UPDATE t_playlist SET song_count = ?, updated_at = ? WHERE id = ?"
    )
      .bind(countResult!.cnt, now, playlistId)
      .run();

    return success(null, "移除成功");
  }

  // PUT /api/playlist/:id/sort
  if (method === "PUT" && subPath === "/sort") {
    const body = await parseBody<{ songIds: number[] }>(request);
    if (!body.songIds || !Array.isArray(body.songIds) || body.songIds.length === 0) {
      return errorResponse(400, "songIds 不能为空");
    }

    for (let i = 0; i < body.songIds.length; i++) {
      await env.DB.prepare(
        "UPDATE t_playlist_song SET sort_order = ? WHERE playlist_id = ? AND song_id = ?"
      )
        .bind(i + 1, playlistId, body.songIds[i])
        .run();
    }

    return success(null, "排序更新成功");
  }

  // POST /api/playlist/:id/collect
  if (method === "POST" && subPath === "/collect") {
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "INSERT OR IGNORE INTO t_collection (uid, target_type, target_id, created_at) VALUES (?, 'playlist', ?, ?)"
    )
      .bind(uid, playlistId, now)
      .run();

    return success(null, "收藏成功");
  }

  // DELETE /api/playlist/:id/collect
  if (method === "DELETE" && subPath === "/collect") {
    await env.DB.prepare(
      "DELETE FROM t_collection WHERE uid = ? AND target_type = 'playlist' AND target_id = ?"
    )
      .bind(uid, playlistId)
      .run();

    return success(null, "取消收藏成功");
  }

  return errorResponse(404, "路由不存在");
}
