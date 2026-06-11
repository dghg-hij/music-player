import { success, errorResponse, authenticate, parseBody, corsHeaders } from "../utils";

interface Env {
  DB: D1Database;
}

export async function handleSongRoutes(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const method = request.method;
  const action = segments[0] || "";

  try {
    switch (action) {
      case "play-url":
        if (method === "GET") return await getPlayUrl(request, env);
        break;

      case "lyrics":
        if (method === "GET") return await getLyrics(request, env);
        break;

      case "detail":
        if (method === "GET") return await getSongDetail(request, env);
        break;

      case "play-report":
        if (method === "POST") return await playReport(request, env);
        break;

      default:
        break;
    }
  } catch (e: any) {
    return errorResponse(500, e.message || "服务器内部错误");
  }

  return errorResponse(404, "路由不存在");
}

/** GET /api/song/play-url — 获取播放地址 */
async function getPlayUrl(request: Request, env: Env): Promise<Response> {
  const uid = await authenticate(request, env.DB);
  if (!uid) {
    return errorResponse(401, "未授权，请先登录");
  }

  const url = new URL(request.url);
  const songId = url.searchParams.get("songId");
  const quality = url.searchParams.get("quality") || "standard";

  if (!songId) {
    return errorResponse(400, "缺少歌曲ID");
  }

  if (!["standard", "high", "lossless"].includes(quality)) {
    return errorResponse(400, "无效的音质参数");
  }

  // 查询歌曲是否存在
  const song = await env.DB.prepare(
    "SELECT id, is_paid FROM t_song WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(Number(songId))
    .first<{ id: number; is_paid: number }>();

  if (!song) {
    return errorResponse(404, "歌曲不存在");
  }

  // D1 评审修正：播放地址由后端动态生成带时效签名的 CDN URL
  // 当前为开发环境，生成模拟 CDN URL
  const now = Date.now();
  const expireAt = now + 10 * 60 * 1000; // 10 分钟有效
  const signature = btoa(`${songId}:${quality}:${expireAt}`).replace(/=/g, "");
  const playUrl = `https://cdn.example.com/song/${songId}/${quality}?sign=${signature}&expire=${expireAt}`;

  return success({
    url: playUrl,
    quality,
  });
}

/** GET /api/song/lyrics — 获取歌词（无需鉴权） */
async function getLyrics(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const songId = url.searchParams.get("songId");

  if (!songId) {
    return errorResponse(400, "缺少歌曲ID");
  }

  const song = await env.DB.prepare(
    "SELECT lyrics, lyrics_translation FROM t_song WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(Number(songId))
    .first<{ lyrics: string; lyrics_translation: string }>();

  if (!song) {
    return errorResponse(404, "歌曲不存在");
  }

  return success({
    lyrics: song.lyrics || "",
    translation: song.lyrics_translation || "",
  });
}

/** GET /api/song/detail — 获取歌曲详情（无需鉴权） */
async function getSongDetail(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const songId = url.searchParams.get("songId");

  if (!songId) {
    return errorResponse(400, "缺少歌曲ID");
  }

  const song = await env.DB.prepare(
    "SELECT id, title, artist_id, album_id, duration, cover, is_paid, heat, genre, language FROM t_song WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(Number(songId))
    .first<{
      id: number;
      title: string;
      artist_id: string;
      album_id: string;
      duration: number;
      cover: string;
      is_paid: number;
      heat: number;
      genre: string;
      language: string;
    }>();

  if (!song) {
    return errorResponse(404, "歌曲不存在");
  }

  return success({
    id: song.id,
    title: song.title,
    artistId: song.artist_id,
    albumId: song.album_id,
    duration: song.duration,
    cover: song.cover,
    isPaid: song.is_paid,
    heat: song.heat,
    genre: song.genre,
    language: song.language,
  });
}

/** POST /api/song/play-report — 播放上报 */
async function playReport(request: Request, env: Env): Promise<Response> {
  const uid = await authenticate(request, env.DB);
  if (!uid) {
    return errorResponse(401, "未授权，请先登录");
  }

  const body = await parseBody<{
    songId: number;
    playTime?: number;
    progress?: number;
    device?: string;
    quality?: string;
  }>(request);

  if (!body.songId) {
    return errorResponse(400, "缺少歌曲ID");
  }

  // 同时写入播放历史（调用 4.9 记录播放逻辑）
  const progressValue = body.progress ?? 0;

  await env.DB.prepare(
    `INSERT INTO t_play_history (uid, song_id, play_count, progress, last_played_at)
     VALUES (?, ?, 1, ?, unixepoch())
     ON CONFLICT(uid, song_id) DO UPDATE SET
       play_count = play_count + 1,
       progress = excluded.progress,
       last_played_at = excluded.last_played_at`
  )
    .bind(uid, body.songId, progressValue)
    .run();

  return success(null, "记录成功");
}
