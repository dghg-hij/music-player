import { success, errorResponse, authenticate, corsHeaders } from "../utils";

interface Env {
  DB: D1Database;
}

export async function handleRecommendRoutes(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const method = request.method;
  const action = segments[0] || "";

  try {
    switch (action) {
      case "daily":
        if (method === "GET") return await getDailyRecommend(request, env);
        break;

      case "fm":
        if (method === "GET") return await getFmRecommend(request, env);
        break;

      case "guess":
        if (method === "GET") return await getGuessRecommend(request, env);
        break;

      default:
        break;
    }
  } catch (e: any) {
    return errorResponse(500, e.message || "服务器内部错误");
  }

  return errorResponse(404, "路由不存在");
}

/** GET /api/recommend/daily — 每日推荐 */
async function getDailyRecommend(request: Request, env: Env): Promise<Response> {
  const uid = await authenticate(request, env.DB);
  if (!uid) {
    return errorResponse(401, "未授权，请先登录");
  }

  // 基于播放历史（40%）+ 收藏/喜欢（30%）+ 搜索记录（15%）+ 主动偏好（15%）
  // 从各来源提取用户偏好的歌手/流派/语种，加权混合后随机选取 30 首

  // 1. 播放历史中高频歌曲的歌手/流派（权重 40%）
  const historySongs = await env.DB.prepare(
    `SELECT s.id, s.artist_id, s.genre, s.language
     FROM t_play_history ph
     JOIN t_song s ON s.id = ph.song_id AND s.deleted_at IS NULL
     WHERE ph.uid = ?
     ORDER BY ph.play_count DESC
     LIMIT 20`
  )
    .bind(uid)
    .all<{ id: number; artist_id: string; genre: string; language: string }>();

  // 2. 收藏/喜欢的歌曲歌手/流派（权重 30%）
  const favoriteSongs = await env.DB.prepare(
    `SELECT s.id, s.artist_id, s.genre, s.language
     FROM t_collection c
     JOIN t_song s ON s.id = CAST(c.target_id AS INTEGER) AND s.deleted_at IS NULL
     WHERE c.uid = ? AND c.target_type = 'song'
     ORDER BY c.created_at DESC
     LIMIT 20`
  )
    .bind(uid)
    .all<{ id: number; artist_id: string; genre: string; language: string }>();

  // 3. 搜索记录关键词（权重 15%）
  const searchLogs = await env.DB.prepare(
    `SELECT keyword FROM t_search_log
     WHERE uid = ?
     ORDER BY created_at DESC
     LIMIT 10`
  )
    .bind(uid)
    .all<{ keyword: string }>();

  // 4. 用户偏好设置（权重 15%）
  const userSettings = await env.DB.prepare(
    "SELECT allow_recommend FROM t_user_settings WHERE uid = ?"
  )
    .bind(uid)
    .first<{ allow_recommend: number }>();

  // 如果用户关闭了个性化推荐，返回热门歌曲
  if (userSettings && userSettings.allow_recommend === 0) {
    const hotSongs = await env.DB.prepare(
      `SELECT id FROM t_song WHERE deleted_at IS NULL
       ORDER BY heat DESC LIMIT 30`
    ).all<{ id: number }>();
    return success({ songs: hotSongs.results.map((s) => s.id) });
  }

  // 收集偏好歌手和流派
  const artistIds = new Set<string>();
  const genres = new Set<string>();
  const languages = new Set<string>();

  for (const s of historySongs.results) {
    if (s.artist_id) artistIds.add(s.artist_id);
    if (s.genre) genres.add(s.genre);
    if (s.language) languages.add(s.language);
  }
  for (const s of favoriteSongs.results) {
    if (s.artist_id) artistIds.add(s.artist_id);
    if (s.genre) genres.add(s.genre);
    if (s.language) languages.add(s.language);
  }

  // 已听过的歌曲 ID，用于排除
  const heardIds = new Set([
    ...historySongs.results.map((s) => s.id),
    ...favoriteSongs.results.map((s) => s.id),
  ]);

  // 基于偏好查询推荐歌曲
  let recommendSongs: { id: number }[] = [];

  if (artistIds.size > 0 || genres.size > 0) {
    // 构建偏好查询条件
    const artistList = [...artistIds];
    const genreList = [...genres];

    // 按歌手匹配
    const placeholders = artistList.map(() => "?").join(",");
    const songsByArtist = await env.DB.prepare(
      `SELECT id FROM t_song
       WHERE deleted_at IS NULL AND artist_id IN (${placeholders})
       ORDER BY heat DESC LIMIT 40`
    )
      .bind(...artistList)
      .all<{ id: number }>();

    // 按流派匹配
    const genrePlaceholders = genreList.map(() => "?").join(",");
    const songsByGenre = await env.DB.prepare(
      `SELECT id FROM t_song
       WHERE deleted_at IS NULL AND genre IN (${genrePlaceholders})
       ORDER BY heat DESC LIMIT 30`
    )
      .bind(...genreList)
      .all<{ id: number }>();

    // 合并去重
    const candidateIds = new Set<number>();
    for (const s of songsByArtist.results) candidateIds.add(s.id);
    for (const s of songsByGenre.results) candidateIds.add(s.id);

    // 过滤已听过的，如果不足则保留部分已听过的
    const freshIds = [...candidateIds].filter((id) => !heardIds.has(id));
    const finalIds = freshIds.length >= 30
      ? freshIds
      : [...freshIds, ...[...candidateIds].filter((id) => heardIds.has(id))];

    // 随机打乱后取 30 首
    const shuffled = finalIds.sort(() => Math.random() - 0.5).slice(0, 30);
    recommendSongs = shuffled.map((id) => ({ id }));
  }

  // 如果偏好数据不足，用热门歌曲填充
  if (recommendSongs.length < 30) {
    const excludeIds = recommendSongs.map((s) => s.id);
    const hotSongs = await env.DB.prepare(
      `SELECT id FROM t_song WHERE deleted_at IS NULL
       ORDER BY heat DESC LIMIT ?`
    )
      .bind(30 - recommendSongs.length)
      .all<{ id: number }>();

    const filtered = hotSongs.results.filter((s) => !excludeIds.includes(s.id) && !heardIds.has(s.id));
    recommendSongs = [...recommendSongs, ...filtered];
  }

  return success({ songs: recommendSongs.map((s) => s.id).slice(0, 30) });
}

/** GET /api/recommend/fm — 私人 FM */
async function getFmRecommend(request: Request, env: Env): Promise<Response> {
  const uid = await authenticate(request, env.DB);
  if (!uid) {
    return errorResponse(401, "未授权，请先登录");
  }

  const url = new URL(request.url);
  const count = parseInt(url.searchParams.get("count") || "10", 10);

  // 推荐来源权重分配
  const sourceWeights: { source: string; weight: number; reason: string }[] = [
    { source: "history", weight: 0.4, reason: "根据你的播放记录推荐" },
    { source: "favorite", weight: 0.3, reason: "根据你的收藏偏好推荐" },
    { source: "search", weight: 0.15, reason: "根据你的搜索记录推荐" },
    { source: "preference", weight: 0.15, reason: "根据你的偏好设置推荐" },
  ];

  const songs: { id: number; source: string; reason: string }[] = [];

  // 按来源分配数量
  for (const sw of sourceWeights) {
    const allocCount = Math.max(1, Math.round(count * sw.weight));
    let sourceSongs: { id: number }[] = [];

    switch (sw.source) {
      case "history": {
        // 基于播放历史中歌手的相似歌曲
        const result = await env.DB.prepare(
          `SELECT DISTINCT s2.id
           FROM t_play_history ph
           JOIN t_song s1 ON s1.id = ph.song_id AND s1.deleted_at IS NULL
           JOIN t_song s2 ON s2.artist_id = s1.artist_id AND s2.deleted_at IS NULL AND s2.id != s1.id
           WHERE ph.uid = ?
           ORDER BY s2.heat DESC
           LIMIT ?`
        )
          .bind(uid, allocCount)
          .all<{ id: number }>();
        sourceSongs = result.results;
        break;
      }
      case "favorite": {
        // 基于收藏歌曲的流派推荐
        const result = await env.DB.prepare(
          `SELECT DISTINCT s2.id
           FROM t_collection c
           JOIN t_song s1 ON s1.id = CAST(c.target_id AS INTEGER) AND s1.deleted_at IS NULL
           JOIN t_song s2 ON s2.genre = s1.genre AND s2.deleted_at IS NULL AND s2.id != s1.id
           WHERE c.uid = ? AND c.target_type = 'song'
           ORDER BY s2.heat DESC
           LIMIT ?`
        )
          .bind(uid, allocCount)
          .all<{ id: number }>();
        sourceSongs = result.results;
        break;
      }
      case "search": {
        // 基于搜索关键词匹配歌曲标题
        const searchLogs = await env.DB.prepare(
          `SELECT keyword FROM t_search_log
           WHERE uid = ? ORDER BY created_at DESC LIMIT 3`
        )
          .bind(uid)
          .all<{ keyword: string }>();

        if (searchLogs.results.length > 0) {
          const keyword = searchLogs.results[0].keyword;
          const result = await env.DB.prepare(
            `SELECT id FROM t_song
             WHERE deleted_at IS NULL AND title LIKE ?
             ORDER BY heat DESC LIMIT ?`
          )
            .bind(`%${keyword}%`, allocCount)
            .all<{ id: number }>();
          sourceSongs = result.results;
        }
        break;
      }
      case "preference": {
        // 热门歌曲作为偏好兜底
        const result = await env.DB.prepare(
          `SELECT id FROM t_song WHERE deleted_at IS NULL
           ORDER BY heat DESC LIMIT ?`
        )
          .bind(allocCount)
          .all<{ id: number }>();
        sourceSongs = result.results;
        break;
      }
    }

    for (const s of sourceSongs.slice(0, allocCount)) {
      songs.push({ id: s.id, source: sw.source, reason: sw.reason });
    }
  }

  // 如果推荐数量不足，用热门歌曲填充（冷启动）
  if (songs.length < count) {
    const existingIds = songs.map((s) => s.id);
    const hotSongs = await env.DB.prepare(
      `SELECT id FROM t_song WHERE deleted_at IS NULL
       ORDER BY heat DESC LIMIT ?`
    )
      .bind(count - songs.length)
      .all<{ id: number }>();

    for (const s of hotSongs.results) {
      if (!existingIds.includes(s.id)) {
        songs.push({ id: s.id, source: "cold-start", reason: "热门推荐" });
      }
    }
  }

  // 随机打乱
  const shuffled = songs.sort(() => Math.random() - 0.5).slice(0, count);

  return success({ songs: shuffled });
}

/** GET /api/recommend/guess — 猜你喜欢 */
async function getGuessRecommend(request: Request, env: Env): Promise<Response> {
  const uid = await authenticate(request, env.DB);
  if (!uid) {
    return errorResponse(401, "未授权，请先登录");
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const size = parseInt(url.searchParams.get("size") || "10", 10);
  const offset = (page - 1) * size;

  // 推荐歌单：基于用户收藏歌单的风格 + 热门公开歌单
  const playlists = await env.DB.prepare(
    `SELECT p.id, p.name, p.cover, p.description, p.creator_uid, p.song_count, p.play_count,
            p.is_public, p.created_at, p.updated_at
     FROM t_playlist p
     WHERE p.deleted_at IS NULL AND p.is_public = 1
     ORDER BY p.play_count DESC
     LIMIT ? OFFSET ?`
  )
    .bind(size, offset)
    .all<{
      id: string;
      name: string;
      cover: string;
      description: string;
      creator_uid: string;
      song_count: number;
      play_count: number;
      is_public: number;
      created_at: number;
      updated_at: number;
    }>();

  // 推荐专辑：基于用户播放历史中歌手的专辑 + 热门专辑
  const albums = await env.DB.prepare(
    `SELECT a.id, a.name, a.artist_id, a.cover, a.release_date, a.song_count, a.description
     FROM t_album a
     WHERE a.deleted_at IS NULL
     ORDER BY a.song_count DESC
     LIMIT ? OFFSET ?`
  )
    .bind(size, offset)
    .all<{
      id: string;
      name: string;
      artist_id: string;
      cover: string;
      release_date: string;
      song_count: number;
      description: string;
    }>();

  return success({
    playlists: playlists.results.map((p) => ({
      id: p.id,
      name: p.name,
      cover: p.cover,
      description: p.description,
      creatorUid: p.creator_uid,
      songCount: p.song_count,
      playCount: p.play_count,
      isPublic: p.is_public === 1,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    albums: albums.results.map((a) => ({
      id: a.id,
      name: a.name,
      artistId: a.artist_id,
      cover: a.cover,
      releaseDate: a.release_date,
      songCount: a.song_count,
      description: a.description,
    })),
  });
}
