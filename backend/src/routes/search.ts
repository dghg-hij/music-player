import { success, errorResponse, authenticate, corsHeaders } from "../utils";

interface Env {
  DB: D1Database;
}

export async function handleSearchRoutes(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const method = request.method;
  const action = segments[0] || "";

  // 所有搜索接口均为 GET，无需鉴权
  if (method !== "GET") {
    return errorResponse(405, "方法不允许");
  }

  try {
    switch (action) {
      case "suggest":
        // GET /api/search/suggest — 搜索联想
        return await searchSuggest(request, env);

      case "hot":
        // GET /api/search/hot — 热门搜索
        return await searchHot(request, env);

      case "":
      default:
        // GET /api/search — 综合搜索
        if (action === "" && segments.length === 0) {
          return await searchKeyword(request, env);
        }
        break;
    }
  } catch (e: any) {
    return errorResponse(500, e.message || "服务器内部错误");
  }

  return errorResponse(404, "路由不存在");
}

export async function handleLibraryRoutes(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const method = request.method;
  const action = segments[0] || "";

  if (method !== "GET") {
    return errorResponse(405, "方法不允许");
  }

  try {
    switch (action) {
      case "category":
        // GET /api/library/category — 分类歌曲
        return await libraryCategory(request, env);

      case "ranking":
        // GET /api/library/ranking — 排行榜
        return await libraryRanking(request, env);

      default:
        break;
    }
  } catch (e: any) {
    return errorResponse(500, e.message || "服务器内部错误");
  }

  return errorResponse(404, "路由不存在");
}

/** GET /api/search — 搜索 */
async function searchKeyword(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword");
  const type = url.searchParams.get("type") || ""; // song / artist / album / playlist
  const page = Number(url.searchParams.get("page")) || 1;
  const size = Number(url.searchParams.get("size")) || 20;
  const sort = url.searchParams.get("sort") || "comprehensive"; // comprehensive / hot / newest
  const filter = url.searchParams.get("filter") || "";

  if (!keyword) {
    return errorResponse(400, "缺少搜索关键词");
  }

  const offset = (page - 1) * size;

  // 尝试获取用户 uid（可选，用于记录搜索日志）
  const uid = await authenticate(request, env.DB);

  // 记录搜索日志
  if (uid) {
    await env.DB.prepare(
      "INSERT INTO t_search_log (uid, keyword, result_count, created_at) VALUES (?, ?, 0, unixepoch())"
    )
      .bind(uid, keyword)
      .run();
  }

  // TODO: 接入真实搜索引擎，当前为基础 SQL LIKE 实现
  const songs: any[] = [];
  const artists: any[] = [];
  const albums: any[] = [];
  const playlists: any[] = [];
  let total = 0;

  // 搜索歌曲
  if (!type || type === "song") {
    const likePattern = `%${keyword}%`;
    const songResults = await env.DB.prepare(
      "SELECT id, title, artist_id, album_id, duration, cover, is_paid, heat, genre, language FROM t_song WHERE title LIKE ? AND deleted_at IS NULL ORDER BY heat DESC LIMIT ? OFFSET ?"
    )
      .bind(likePattern, size, offset)
      .all<{
        id: number; title: string; artist_id: string; album_id: string;
        duration: number; cover: string; is_paid: number; heat: number;
        genre: string; language: string;
      }>();

    for (const row of songResults.results) {
      songs.push({
        id: row.id,
        title: row.title,
        artistId: row.artist_id,
        albumId: row.album_id,
        duration: row.duration,
        cover: row.cover,
        isPaid: row.is_paid,
        heat: row.heat,
        genre: row.genre,
        language: row.language,
      });
    }

    const countResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM t_song WHERE title LIKE ? AND deleted_at IS NULL"
    )
      .bind(likePattern)
      .first<{ cnt: number }>();
    total += countResult?.cnt ?? 0;
  }

  // 搜索歌手
  if (!type || type === "artist") {
    const likePattern = `%${keyword}%`;
    const artistResults = await env.DB.prepare(
      "SELECT id, name, avatar, song_count, album_count FROM t_artist WHERE name LIKE ? AND deleted_at IS NULL LIMIT ? OFFSET ?"
    )
      .bind(likePattern, size, offset)
      .all();

    for (const row of artistResults.results) {
      artists.push(row);
    }

    const countResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM t_artist WHERE name LIKE ? AND deleted_at IS NULL"
    )
      .bind(likePattern)
      .first<{ cnt: number }>();
    total += countResult?.cnt ?? 0;
  }

  // 搜索专辑
  if (!type || type === "album") {
    const likePattern = `%${keyword}%`;
    const albumResults = await env.DB.prepare(
      "SELECT id, name, artist_id, cover, song_count FROM t_album WHERE name LIKE ? AND deleted_at IS NULL LIMIT ? OFFSET ?"
    )
      .bind(likePattern, size, offset)
      .all();

    for (const row of albumResults.results) {
      albums.push(row);
    }

    const countResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM t_album WHERE name LIKE ? AND deleted_at IS NULL"
    )
      .bind(likePattern)
      .first<{ cnt: number }>();
    total += countResult?.cnt ?? 0;
  }

  // 搜索歌单
  if (!type || type === "playlist") {
    const likePattern = `%${keyword}%`;
    const playlistResults = await env.DB.prepare(
      "SELECT id, name, cover, description, creator_uid, song_count, play_count FROM t_playlist WHERE name LIKE ? AND deleted_at IS NULL AND is_public = 1 LIMIT ? OFFSET ?"
    )
      .bind(likePattern, size, offset)
      .all();

    for (const row of playlistResults.results) {
      playlists.push(row);
    }

    const countResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM t_playlist WHERE name LIKE ? AND deleted_at IS NULL AND is_public = 1"
    )
      .bind(likePattern)
      .first<{ cnt: number }>();
    total += countResult?.cnt ?? 0;
  }

  // 更新搜索日志的结果数量
  if (uid) {
    await env.DB.prepare(
      "UPDATE t_search_log SET result_count = ? WHERE uid = ? AND keyword = ? ORDER BY created_at DESC LIMIT 1"
    )
      .bind(total, uid, keyword)
      .run();
  }

  return success({ songs, artists, albums, playlists, total });
}

/** GET /api/search/suggest — 搜索联想 */
async function searchSuggest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword");

  if (!keyword) {
    return errorResponse(400, "缺少搜索关键词");
  }

  const likePattern = `%${keyword}%`;
  const suggestions: { text: string; type: string }[] = [];

  // 歌曲联想
  const songResults = await env.DB.prepare(
    "SELECT title FROM t_song WHERE title LIKE ? AND deleted_at IS NULL ORDER BY heat DESC LIMIT 5"
  )
    .bind(likePattern)
    .all<{ title: string }>();

  for (const row of songResults.results) {
    suggestions.push({ text: row.title, type: "song" });
  }

  // 歌手联想
  const artistResults = await env.DB.prepare(
    "SELECT name FROM t_artist WHERE name LIKE ? AND deleted_at IS NULL LIMIT 5"
  )
    .bind(likePattern)
    .all<{ name: string }>();

  for (const row of artistResults.results) {
    suggestions.push({ text: row.name, type: "artist" });
  }

  // 专辑联想
  const albumResults = await env.DB.prepare(
    "SELECT name FROM t_album WHERE name LIKE ? AND deleted_at IS NULL LIMIT 5"
  )
    .bind(likePattern)
    .all<{ name: string }>();

  for (const row of albumResults.results) {
    suggestions.push({ text: row.name, type: "album" });
  }

  return success({ suggestions });
}

/** GET /api/search/hot — 热门搜索 */
async function searchHot(request: Request, env: Env): Promise<Response> {
  // 基于搜索日志统计热门关键词
  const results = await env.DB.prepare(
    `SELECT keyword, COUNT(*) as search_count FROM t_search_log
     WHERE created_at > unixepoch() - 86400 * 7
     GROUP BY keyword
     ORDER BY search_count DESC
     LIMIT 20`
  )
    .all<{ keyword: string; search_count: number }>();

  const keywords = results.results.map((row, index) => ({
    rank: index + 1,
    text: row.keyword,
    heat: row.search_count,
  }));

  // TODO: 如果搜索日志为空，返回默认热门关键词

  return success({ keywords });
}

/** GET /api/library/category — 分类歌曲 */
async function libraryCategory(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId");
  const page = Number(url.searchParams.get("page")) || 1;
  const size = Number(url.searchParams.get("size")) || 20;

  if (!categoryId) {
    return errorResponse(400, "缺少分类ID");
  }

  const offset = (page - 1) * size;

  // TODO: 接入分类表，当前按 genre 或 language 简单筛选
  // categoryId 映射：genre_xxx 或 language_xxx
  let query: string;
  let bindings: any[];

  if (categoryId.startsWith("genre_")) {
    const genre = categoryId.replace("genre_", "");
    query = "SELECT id, title, artist_id, album_id, duration, cover, is_paid, heat, genre, language FROM t_song WHERE genre = ? AND deleted_at IS NULL ORDER BY heat DESC LIMIT ? OFFSET ?";
    bindings = [genre, size, offset];
  } else if (categoryId.startsWith("language_")) {
    const language = categoryId.replace("language_", "");
    query = "SELECT id, title, artist_id, album_id, duration, cover, is_paid, heat, genre, language FROM t_song WHERE language = ? AND deleted_at IS NULL ORDER BY heat DESC LIMIT ? OFFSET ?";
    bindings = [language, size, offset];
  } else {
    query = "SELECT id, title, artist_id, album_id, duration, cover, is_paid, heat, genre, language FROM t_song WHERE deleted_at IS NULL ORDER BY heat DESC LIMIT ? OFFSET ?";
    bindings = [size, offset];
  }

  const results = await env.DB.prepare(query).bind(...bindings).all<{
    id: number; title: string; artist_id: string; album_id: string;
    duration: number; cover: string; is_paid: number; heat: number;
    genre: string; language: string;
  }>();

  const songs = results.results.map((row) => ({
    id: row.id,
    title: row.title,
    artistId: row.artist_id,
    albumId: row.album_id,
    duration: row.duration,
    cover: row.cover,
    isPaid: row.is_paid,
    heat: row.heat,
    genre: row.genre,
    language: row.language,
  }));

  // 获取总数
  let countQuery: string;
  let countBindings: any[];
  if (categoryId.startsWith("genre_")) {
    const genre = categoryId.replace("genre_", "");
    countQuery = "SELECT COUNT(*) as cnt FROM t_song WHERE genre = ? AND deleted_at IS NULL";
    countBindings = [genre];
  } else if (categoryId.startsWith("language_")) {
    const language = categoryId.replace("language_", "");
    countQuery = "SELECT COUNT(*) as cnt FROM t_song WHERE language = ? AND deleted_at IS NULL";
    countBindings = [language];
  } else {
    countQuery = "SELECT COUNT(*) as cnt FROM t_song WHERE deleted_at IS NULL";
    countBindings = [];
  }

  const countResult = await env.DB.prepare(countQuery).bind(...countBindings).first<{ cnt: number }>();

  return success({
    songs,
    total: countResult?.cnt ?? 0,
  });
}

/** GET /api/library/ranking — 排行榜 */
async function libraryRanking(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const rankingId = url.searchParams.get("rankingId");

  // 不传 rankingId 时返回排行榜列表
  if (!rankingId) {
    // TODO: 从配置表读取排行榜列表，当前返回默认列表
    const rankings = [
      { id: "hot", name: "热歌榜", description: "最热门的歌曲" },
      { id: "new", name: "新歌榜", description: "最新上架的歌曲" },
      { id: "surge", name: "飙升榜", description: "热度上升最快的歌曲" },
    ];
    return success({ rankings });
  }

  // 根据 rankingId 返回排行歌曲
  let query: string;
  switch (rankingId) {
    case "hot":
      query = "SELECT id, title, artist_id, album_id, duration, cover, is_paid, heat, genre, language FROM t_song WHERE deleted_at IS NULL ORDER BY heat DESC LIMIT 100";
      break;
    case "new":
      query = "SELECT id, title, artist_id, album_id, duration, cover, is_paid, heat, genre, language FROM t_song WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100";
      break;
    case "surge":
      // TODO: 飙升榜需要增量计算，当前使用 heat 排序代替
      query = "SELECT id, title, artist_id, album_id, duration, cover, is_paid, heat, genre, language FROM t_song WHERE deleted_at IS NULL ORDER BY heat DESC LIMIT 100";
      break;
    default:
      return errorResponse(400, "无效的排行榜ID");
  }

  const results = await env.DB.prepare(query).all<{
    id: number; title: string; artist_id: string; album_id: string;
    duration: number; cover: string; is_paid: number; heat: number;
    genre: string; language: string;
  }>();

  const songs = results.results.map((row, index) => ({
    id: row.id,
    title: row.title,
    artistId: row.artist_id,
    albumId: row.album_id,
    duration: row.duration,
    cover: row.cover,
    isPaid: row.is_paid,
    heat: row.heat,
    genre: row.genre,
    language: row.language,
    rank: index + 1,
  }));

  return success({ songs });
}
