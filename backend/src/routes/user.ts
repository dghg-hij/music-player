import { success, error, errorResponse, authenticate, parseBody, corsHeaders } from "../utils";

interface Env {
  DB: D1Database;
}

const DEFAULT_SETTINGS = {
  cacheSize: 2048,
  playbackRate: 1,
  quality: "standard",
  autoPlay: false,
  theme: "system",
  lyricFontSize: 16,
  lyricTranslation: true,
  privacy: {
    publicHistory: false,
    allowRecommend: true,
  },
};

export async function handleUserRoutes(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const uid = await authenticate(request, env.DB);
  if (!uid) {
    return errorResponse(401, "未授权，请先登录");
  }

  const method = request.method;
  const action = segments[0] || "";

  try {
    switch (action) {
      case "info":
        if (method === "GET") return await getUserInfo(env, uid);
        break;

      case "profile":
        if (method === "PUT") return await updateProfile(request, env, uid);
        break;

      case "password":
        if (method === "PUT") return await changePassword(request, env, uid);
        break;

      case "settings":
        if (method === "GET") return await getSettings(env, uid);
        if (method === "PUT") return await saveSettings(request, env, uid);
        break;

      case "favorites":
        if (method === "GET") return await getFavorites(env, uid);
        if (method === "POST") return await addFavorite(request, env, uid);
        if (method === "DELETE") return await removeFavorite(request, env, uid, segments);
        break;

      case "history":
        if (method === "GET") return await getHistory(env, uid);
        if (method === "POST") return await recordPlay(request, env, uid);
        if (method === "DELETE") return await clearHistory(env, uid);
        break;

      case "downloads":
        if (method === "GET") return await getDownloads(env, uid);
        break;

      case "playlists":
        if (method === "GET") return await getPlaylists(env, uid);
        break;

      default:
        break;
    }
  } catch (e: any) {
    return errorResponse(500, e.message || "服务器内部错误");
  }

  return errorResponse(404, "路由不存在");
}

async function getUserInfo(env: Env, uid: string): Promise<Response> {
  const row = await env.DB.prepare(
    "SELECT uid, phone, account, nickname, avatar, signature FROM t_user WHERE uid = ? AND deleted_at IS NULL"
  )
    .bind(uid)
    .first();

  if (!row) {
    return errorResponse(404, "用户不存在");
  }

  return success({
    uid: row.uid,
    phone: row.phone,
    account: row.account,
    nickname: row.nickname,
    avatar: row.avatar,
    signature: row.signature,
  });
}

async function updateProfile(
  request: Request,
  env: Env,
  uid: string
): Promise<Response> {
  const body = await parseBody(request);
  const { nickname, avatar, signature } = body as any;

  if (nickname !== undefined) {
    if (typeof nickname !== "string" || nickname.length < 2 || nickname.length > 20) {
      return errorResponse(400, "昵称长度需在2-20个字符之间");
    }
  }

  if (signature !== undefined) {
    if (typeof signature !== "string" || signature.length > 100) {
      return errorResponse(400, "个性签名不能超过100个字符");
    }
  }

  if (avatar !== undefined) {
    if (typeof avatar !== "string") {
      return errorResponse(400, "头像格式不正确");
    }
    if (avatar && !/^https?:\/\/.+/.test(avatar)) {
      return errorResponse(400, "头像必须是有效的URL地址");
    }
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (nickname !== undefined) {
    fields.push("nickname = ?");
    values.push(nickname);
  }
  if (avatar !== undefined) {
    fields.push("avatar = ?");
    values.push(avatar);
  }
  if (signature !== undefined) {
    fields.push("signature = ?");
    values.push(signature);
  }

  if (fields.length === 0) {
    return errorResponse(400, "没有需要更新的字段");
  }

  fields.push("updated_at = unixepoch()");
  values.push(uid);

  await env.DB.prepare(
    `UPDATE t_user SET ${fields.join(", ")} WHERE uid = ?`
  )
    .bind(...values)
    .run();

  return await getUserInfo(env, uid);
}

async function changePassword(
  request: Request,
  env: Env,
  uid: string
): Promise<Response> {
  const body = await parseBody(request);
  const { oldPassword, newPassword } = body as any;

  if (!oldPassword || !newPassword) {
    return errorResponse(400, "请提供旧密码和新密码");
  }

  const row = await env.DB.prepare(
    "SELECT password FROM t_user WHERE uid = ? AND deleted_at IS NULL"
  )
    .bind(uid)
    .first();

  if (!row) {
    return errorResponse(404, "用户不存在");
  }

  const storedPassword = row.password as string;

  const encoder = new TextEncoder();
  const oldHash = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(oldPassword)
  );
  const oldHashHex = Array.from(new Uint8Array(oldHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (oldHashHex !== storedPassword) {
    return errorResponse(400, "旧密码不正确");
  }

  if (!/^[a-zA-Z0-9]{8,16}$/.test(newPassword)) {
    return errorResponse(400, "新密码需为8-16位字母数字组合");
  }

  if (oldPassword === newPassword) {
    return errorResponse(400, "新密码不能与旧密码相同");
  }

  const newHash = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(newPassword)
  );
  const newHashHex = Array.from(new Uint8Array(newHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await env.DB.prepare(
    "UPDATE t_user SET password = ?, updated_at = unixepoch() WHERE uid = ?"
  )
    .bind(newHashHex, uid)
    .run();

  return success(null, "密码修改成功");
}

async function getSettings(env: Env, uid: string): Promise<Response> {
  const row = await env.DB.prepare(
    "SELECT cache_size, playback_rate, quality, auto_play, theme, lyric_font_size, lyric_translation, public_history, allow_recommend FROM t_user_settings WHERE uid = ?"
  )
    .bind(uid)
    .first();

  if (!row) {
    return success(DEFAULT_SETTINGS);
  }

  return success({
    cacheSize: row.cache_size,
    playbackRate: row.playback_rate,
    quality: row.quality,
    autoPlay: !!row.auto_play,
    theme: row.theme,
    lyricFontSize: row.lyric_font_size,
    lyricTranslation: !!row.lyric_translation,
    privacy: {
      publicHistory: !!row.public_history,
      allowRecommend: !!row.allow_recommend,
    },
  });
}

async function saveSettings(
  request: Request,
  env: Env,
  uid: string
): Promise<Response> {
  const body = await parseBody(request);
  const s = body as any;

  const cacheSize = s.cacheSize ?? DEFAULT_SETTINGS.cacheSize;
  const playbackRate = s.playbackRate ?? DEFAULT_SETTINGS.playbackRate;
  const quality = s.quality ?? DEFAULT_SETTINGS.quality;
  const autoPlay = s.autoPlay ?? DEFAULT_SETTINGS.autoPlay ? 1 : 0;
  const theme = s.theme ?? DEFAULT_SETTINGS.theme;
  const lyricFontSize = s.lyricFontSize ?? DEFAULT_SETTINGS.lyricFontSize;
  const lyricTranslation = s.lyricTranslation ?? DEFAULT_SETTINGS.lyricTranslation ? 1 : 0;
  const publicHistory = s.privacy?.publicHistory ?? DEFAULT_SETTINGS.privacy.publicHistory ? 1 : 0;
  const allowRecommend = s.privacy?.allowRecommend ?? DEFAULT_SETTINGS.privacy.allowRecommend ? 1 : 0;

  await env.DB.prepare(
    `INSERT OR REPLACE INTO t_user_settings (uid, cache_size, playback_rate, quality, auto_play, theme, lyric_font_size, lyric_translation, public_history, allow_recommend, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
  )
    .bind(
      uid,
      cacheSize,
      playbackRate,
      quality,
      autoPlay,
      theme,
      lyricFontSize,
      lyricTranslation,
      publicHistory,
      allowRecommend
    )
    .run();

  return success({
    cacheSize,
    playbackRate,
    quality,
    autoPlay: !!autoPlay,
    theme,
    lyricFontSize,
    lyricTranslation: !!lyricTranslation,
    privacy: {
      publicHistory: !!publicHistory,
      allowRecommend: !!allowRecommend,
    },
  });
}

async function getFavorites(env: Env, uid: string): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT target_id FROM t_collection WHERE uid = ? AND target_type = 'song' ORDER BY created_at DESC"
  )
    .bind(uid)
    .all();

  const songIds = (result.results || []).map((row: any) => Number(row.target_id));

  return success({ songIds });
}

async function addFavorite(
  request: Request,
  env: Env,
  uid: string
): Promise<Response> {
  const body = await parseBody(request);
  const songId = (body as any).songId;

  if (!songId) {
    return errorResponse(400, "缺少歌曲ID");
  }

  await env.DB.prepare(
    "INSERT OR IGNORE INTO t_collection (uid, target_type, target_id, created_at) VALUES (?, 'song', ?, unixepoch())"
  )
    .bind(uid, String(songId))
    .run();

  return success(null, "收藏成功");
}

async function removeFavorite(
  request: Request,
  env: Env,
  uid: string,
  segments: string[]
): Promise<Response> {
  const songId = segments[1];
  if (!songId) {
    return errorResponse(400, "缺少歌曲ID");
  }

  await env.DB.prepare(
    "DELETE FROM t_collection WHERE uid = ? AND target_type = 'song' AND target_id = ?"
  )
    .bind(uid, songId)
    .run();

  return success(null, "取消收藏成功");
}

async function getHistory(env: Env, uid: string): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT song_id, play_count, progress, last_played_at FROM t_play_history WHERE uid = ? ORDER BY last_played_at DESC LIMIT 100"
  )
    .bind(uid)
    .all();

  const list = (result.results || []).map((row: any) => ({
    songId: row.song_id,
    playCount: row.play_count,
    progress: row.progress,
    lastPlayedAt: row.last_played_at,
  }));

  return success({ list });
}

async function recordPlay(
  request: Request,
  env: Env,
  uid: string
): Promise<Response> {
  const body = await parseBody(request);
  const { songId, progress } = body as any;

  if (!songId) {
    return errorResponse(400, "缺少歌曲ID");
  }

  const progressValue = progress ?? 0;

  await env.DB.prepare(
    `INSERT INTO t_play_history (uid, song_id, play_count, progress, last_played_at)
     VALUES (?, ?, 1, ?, unixepoch())
     ON CONFLICT(uid, song_id) DO UPDATE SET
       play_count = play_count + 1,
       progress = excluded.progress,
       last_played_at = excluded.last_played_at`
  )
    .bind(uid, songId, progressValue)
    .run();

  return success(null, "记录成功");
}

async function clearHistory(env: Env, uid: string): Promise<Response> {
  await env.DB.prepare("DELETE FROM t_play_history WHERE uid = ?")
    .bind(uid)
    .run();

  return success(null, "播放历史已清空");
}

async function getDownloads(env: Env, uid: string): Promise<Response> {
  return success({ songIds: [] });
}

async function getPlaylists(env: Env, uid: string): Promise<Response> {
  const createdResult = await env.DB.prepare(
    "SELECT id, name, cover, description, creator_uid, song_count, play_count, is_public, created_at, updated_at FROM t_playlist WHERE creator_uid = ? AND deleted_at IS NULL ORDER BY created_at DESC"
  )
    .bind(uid)
    .all();

  const created = (createdResult.results || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    cover: row.cover,
    description: row.description,
    creatorUid: row.creator_uid,
    songCount: row.song_count,
    playCount: row.play_count,
    isPublic: !!row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const collectedResult = await env.DB.prepare(
    "SELECT target_id FROM t_collection WHERE uid = ? AND target_type = 'playlist' ORDER BY created_at DESC"
  )
    .bind(uid)
    .all();

  const collected = (collectedResult.results || []).map(
    (row: any) => row.target_id
  );

  return success({ created, collected });
}
