// ============================================================
// 模块10 - 数据库设计
// 表结构类型定义，与 schema.sql 一一对应
// ============================================================

/** t_user — 用户表 */
export interface TUser {
  uid: string;
  phone: string | null;
  account: string | null;
  password: string;
  nickname: string;
  avatar: string | null;
  signature: string | null;
  status: number; // 0=禁用 1=正常
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/** t_song — 歌曲表 */
export interface TSong {
  id: number;
  netease_id: number | null;
  title: string;
  artist_id: string | null;
  album_id: string | null;
  duration: number | null;
  cover: string | null;
  lyrics: string | null;
  lyrics_translation: string | null;
  is_paid: number; // 0=免费 1=付费
  heat: number | null;
  genre: string | null;
  language: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/** t_album — 专辑表 */
export interface TAlbum {
  id: string;
  name: string;
  artist_id: string | null;
  cover: string | null;
  release_date: string | null;
  song_count: number | null;
  description: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/** t_artist — 歌手表 */
export interface TArtist {
  id: string;
  name: string;
  avatar: string | null;
  song_count: number | null;
  album_count: number | null;
  description: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/** t_playlist — 歌单表 */
export interface TPlaylist {
  id: string;
  name: string;
  cover: string | null;
  description: string | null;
  creator_uid: string;
  song_count: number | null;
  play_count: number | null;
  is_public: number; // 0=私密 1=公开
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/** t_playlist_song — 歌单歌曲关联表 */
export interface TPlaylistSong {
  id: number;
  playlist_id: string;
  song_id: number;
  sort_order: number;
  added_at: number;
}

/** t_collection — 收藏表 */
export interface TCollection {
  id: number;
  uid: string;
  target_type: "playlist" | "song";
  target_id: string;
  created_at: number;
}

/** t_play_history — 播放历史表 */
export interface TPlayHistory {
  id: number;
  uid: string;
  song_id: number;
  play_count: number;
  progress: number | null;
  last_played_at: number;
}

/** t_user_settings — 用户设置表 */
export interface TUserSettings {
  uid: string;
  cache_size: number;
  playback_rate: number;
  quality: string; // standard / high / lossless
  auto_play: number; // 0 / 1
  theme: string; // dark / light / system
  lyric_font_size: number;
  lyric_translation: number; // 0 / 1
  public_history: number; // 0 / 1
  allow_recommend: number; // 0 / 1
  updated_at: number;
}

/** t_feedback — 反馈表 */
export interface TFeedback {
  id: number;
  uid: string;
  content: string;
  contact: string | null;
  screenshot: string | null;
  status: "pending" | "processing" | "resolved" | "closed";
  created_at: number;
}

/** t_search_log — 搜索日志表 */
export interface TSearchLog {
  id: number;
  uid: string;
  keyword: string;
  result_count: number | null;
  created_at: number;
}

/** t_oauth — 第三方授权表 */
export interface TOauth {
  id: number;
  uid: string;
  provider: string; // wechat / qq / apple
  provider_uid: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

/** t_sms_code — 短信验证码表 */
export interface TSmsCode {
  id: number;
  phone: string;
  code: string;
  type: "login" | "register" | "reset";
  expires_at: number;
  created_at: number;
}

/** t_token — Token 表 */
export interface TToken {
  id: number;
  uid: string;
  access_token: string;
  refresh_token: string;
  access_expires_at: number; // 毫秒
  refresh_expires_at: number; // 毫秒
  created_at: number;
}

/** 所有表的映射 */
export interface Tables {
  t_user: TUser;
  t_song: TSong;
  t_album: TAlbum;
  t_artist: TArtist;
  t_playlist: TPlaylist;
  t_playlist_song: TPlaylistSong;
  t_collection: TCollection;
  t_play_history: TPlayHistory;
  t_user_settings: TUserSettings;
  t_feedback: TFeedback;
  t_search_log: TSearchLog;
  t_oauth: TOauth;
  t_sms_code: TSmsCode;
  t_token: TToken;
}

/** 表名类型 */
export type TableName = keyof Tables;
