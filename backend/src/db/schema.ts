// ============================================================
// 模块10 - 数据库设计
// 数据库初始化与建表语句
// ============================================================

/**
 * 所有建表 SQL，与 schema.sql 保持同步
 * 用于运行时动态初始化（如本地开发、测试环境）
 */
export const SCHEMA_SQL = `
-- t_user
CREATE TABLE IF NOT EXISTS t_user (
  uid TEXT PRIMARY KEY,
  phone TEXT UNIQUE,
  account TEXT UNIQUE,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  avatar TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  status INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_phone ON t_user(phone);
CREATE INDEX IF NOT EXISTS idx_user_account ON t_user(account);

-- t_song
CREATE TABLE IF NOT EXISTS t_song (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  netease_id INTEGER UNIQUE,
  title TEXT NOT NULL,
  artist_id TEXT DEFAULT '',
  album_id TEXT DEFAULT '',
  duration INTEGER DEFAULT 0,
  cover TEXT DEFAULT '',
  lyrics TEXT DEFAULT '',
  lyrics_translation TEXT DEFAULT '',
  is_paid INTEGER NOT NULL DEFAULT 0,
  heat INTEGER DEFAULT 0,
  genre TEXT DEFAULT '',
  language TEXT DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_song_netease_id ON t_song(netease_id);

-- t_album
CREATE TABLE IF NOT EXISTS t_album (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  artist_id TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  release_date TEXT DEFAULT '',
  song_count INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER DEFAULT NULL
);

-- t_artist
CREATE TABLE IF NOT EXISTS t_artist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  song_count INTEGER DEFAULT 0,
  album_count INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER DEFAULT NULL
);

-- t_playlist
CREATE TABLE IF NOT EXISTS t_playlist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cover TEXT DEFAULT '',
  description TEXT DEFAULT '',
  creator_uid TEXT NOT NULL,
  song_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_playlist_creator ON t_playlist(creator_uid);

-- t_playlist_song
CREATE TABLE IF NOT EXISTS t_playlist_song (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id TEXT NOT NULL,
  song_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(playlist_id, song_id)
);
CREATE INDEX IF NOT EXISTS idx_ps_playlist ON t_playlist_song(playlist_id);
CREATE INDEX IF NOT EXISTS idx_ps_song ON t_playlist_song(song_id);

-- t_collection
CREATE TABLE IF NOT EXISTS t_collection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('playlist', 'song')),
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(uid, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_uid ON t_collection(uid);
CREATE INDEX IF NOT EXISTS idx_collection_target ON t_collection(target_type, target_id);

-- t_play_history
CREATE TABLE IF NOT EXISTS t_play_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  song_id INTEGER NOT NULL,
  play_count INTEGER NOT NULL DEFAULT 1,
  progress REAL DEFAULT 0,
  last_played_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(uid, song_id)
);
CREATE INDEX IF NOT EXISTS idx_history_uid ON t_play_history(uid);
CREATE INDEX IF NOT EXISTS idx_history_last ON t_play_history(uid, last_played_at DESC);

-- t_user_settings
CREATE TABLE IF NOT EXISTS t_user_settings (
  uid TEXT PRIMARY KEY,
  cache_size INTEGER DEFAULT 2048,
  playback_rate REAL DEFAULT 1,
  quality TEXT DEFAULT 'standard',
  auto_play INTEGER DEFAULT 0,
  theme TEXT DEFAULT 'system',
  lyric_font_size INTEGER DEFAULT 16,
  lyric_translation INTEGER DEFAULT 1,
  public_history INTEGER DEFAULT 0,
  allow_recommend INTEGER DEFAULT 1,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- t_feedback
CREATE TABLE IF NOT EXISTS t_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  content TEXT NOT NULL,
  contact TEXT DEFAULT '',
  screenshot TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_feedback_uid ON t_feedback(uid);

-- t_search_log
CREATE TABLE IF NOT EXISTS t_search_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  keyword TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_search_uid ON t_search_log(uid);
CREATE INDEX IF NOT EXISTS idx_search_keyword ON t_search_log(keyword);

-- t_oauth
CREATE TABLE IF NOT EXISTS t_oauth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_uid TEXT NOT NULL,
  access_token TEXT DEFAULT '',
  refresh_token TEXT DEFAULT '',
  expires_at INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(provider, provider_uid)
);
CREATE INDEX IF NOT EXISTS idx_oauth_uid ON t_oauth(uid);

-- t_sms_code
CREATE TABLE IF NOT EXISTS t_sms_code (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('login', 'register', 'reset')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_sms_phone ON t_sms_code(phone, type);

-- t_token
CREATE TABLE IF NOT EXISTS t_token (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT NOT NULL UNIQUE,
  access_expires_at INTEGER NOT NULL,
  refresh_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_token_access ON t_token(access_token);
CREATE INDEX IF NOT EXISTS idx_token_refresh ON t_token(refresh_token);
CREATE INDEX IF NOT EXISTS idx_token_uid ON t_token(uid);
`;

/**
 * 初始化数据库：执行所有建表语句
 * 适用于本地开发或测试环境自动建表
 */
export async function initDatabase(db: D1Database): Promise<void> {
  // D1 的 exec 方法支持批量执行多条 SQL
  await db.exec(SCHEMA_SQL);
}
