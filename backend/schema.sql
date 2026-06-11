-- ============================================================
-- 音乐播放器数据库 Schema
-- 对应 PRD 4.3 数据库设计
-- 数据库：Cloudflare D1 (SQLite)
-- ============================================================

-- 1. t_user — 用户表 PRD 4.3.1
CREATE TABLE IF NOT EXISTS t_user (
  uid TEXT PRIMARY KEY,
  phone TEXT UNIQUE,
  account TEXT UNIQUE,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  avatar TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  status INTEGER NOT NULL DEFAULT 1,  -- 0=禁用 1=正常
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_phone ON t_user(phone);
CREATE INDEX IF NOT EXISTS idx_user_account ON t_user(account);

-- 2. t_song — 歌曲表 PRD 4.3.2
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
  is_paid INTEGER NOT NULL DEFAULT 0,  -- 0=免费 1=付费
  heat INTEGER DEFAULT 0,
  genre TEXT DEFAULT '',
  language TEXT DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_song_netease_id ON t_song(netease_id);

-- 3. t_album — 专辑表 PRD 4.3.3
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

-- 4. t_artist — 歌手表 PRD 4.3.4
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

-- 5. t_playlist — 歌单表 PRD 4.3.5
CREATE TABLE IF NOT EXISTS t_playlist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cover TEXT DEFAULT '',
  description TEXT DEFAULT '',
  creator_uid TEXT NOT NULL,
  song_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 1,  -- 0=私密 1=公开
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_playlist_creator ON t_playlist(creator_uid);

-- 6. t_playlist_song — 歌单歌曲关联表 PRD 4.3.6
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

-- 7. t_collection — 收藏表 PRD 4.3.7
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

-- 8. t_play_history — 播放历史表 PRD 4.3.8
-- D3 评审修正：使用 upsert 逻辑（同歌曲覆盖更新）
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

-- 9. t_user_settings — 用户设置表 PRD 4.3.9
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

-- 10. t_member — 会员表 PRD 4.3.10
CREATE TABLE IF NOT EXISTS t_member (
  uid TEXT PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'normal',  -- normal/vip/svip
  expire_time INTEGER DEFAULT 0,
  auto_renew INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 11. t_order — 订单表 PRD 4.3.11
CREATE TABLE IF NOT EXISTS t_order (
  order_no TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  level TEXT NOT NULL,
  cycle TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/paid/cancelled/refunded
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  paid_at INTEGER DEFAULT NULL,
  effective_until INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_uid ON t_order(uid);
CREATE INDEX IF NOT EXISTS idx_order_status ON t_order(status);

-- 12. t_feedback — 反馈表 PRD 4.3.12
CREATE TABLE IF NOT EXISTS t_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  content TEXT NOT NULL,
  contact TEXT DEFAULT '',
  screenshot TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/processing/resolved/closed
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_feedback_uid ON t_feedback(uid);

-- 13. t_search_log — 搜索日志表 PRD 4.3.13
CREATE TABLE IF NOT EXISTS t_search_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  keyword TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_search_uid ON t_search_log(uid);
CREATE INDEX IF NOT EXISTS idx_search_keyword ON t_search_log(keyword);

-- 14. t_oauth — 第三方授权表 PRD 4.3（D2 评审新增）
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

-- 15. t_sms_code — 短信验证码表（新增，替代 localStorage 存储）
CREATE TABLE IF NOT EXISTS t_sms_code (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('login', 'register', 'reset')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_sms_phone ON t_sms_code(phone, type);

-- 16. t_token — Token 表（用于服务端 Token 管理）
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
