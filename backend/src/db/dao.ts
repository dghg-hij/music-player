// ============================================================
// 模块10 - 数据库设计
// 数据访问层（DAO）：封装各表的 CRUD 操作
// ============================================================

import type {
  TUser,
  TSong,
  TAlbum,
  TArtist,
  TPlaylist,
  TPlaylistSong,
  TCollection,
  TPlayHistory,
  TUserSettings,
  TFeedback,
  TSearchLog,
  TOauth,
  TSmsCode,
  TToken,
} from "./types";

// ==================== 用户表 DAO ====================

export const UserDao = {
  async findById(db: D1Database, uid: string): Promise<TUser | null> {
    return db
      .prepare("SELECT * FROM t_user WHERE uid = ? AND deleted_at IS NULL")
      .bind(uid)
      .first<TUser>();
  },

  async findByPhone(db: D1Database, phone: string): Promise<TUser | null> {
    return db
      .prepare("SELECT * FROM t_user WHERE phone = ? AND deleted_at IS NULL")
      .bind(phone)
      .first<TUser>();
  },

  async findByAccount(db: D1Database, account: string): Promise<TUser | null> {
    return db
      .prepare("SELECT * FROM t_user WHERE account = ? AND deleted_at IS NULL")
      .bind(account)
      .first<TUser>();
  },

  async create(
    db: D1Database,
    data: { uid: string; phone: string; account: string; password: string; nickname: string }
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .prepare(
        "INSERT INTO t_user (uid, phone, account, password, nickname, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)"
      )
      .bind(data.uid, data.phone, data.account, data.password, data.nickname, now, now)
      .run();
  },

  async updateProfile(
    db: D1Database,
    uid: string,
    fields: Partial<Pick<TUser, "nickname" | "avatar" | "signature">>
  ): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.nickname !== undefined) {
      sets.push("nickname = ?");
      values.push(fields.nickname);
    }
    if (fields.avatar !== undefined) {
      sets.push("avatar = ?");
      values.push(fields.avatar);
    }
    if (fields.signature !== undefined) {
      sets.push("signature = ?");
      values.push(fields.signature);
    }

    if (sets.length === 0) return;

    sets.push("updated_at = unixepoch()");
    values.push(uid);

    await db
      .prepare(`UPDATE t_user SET ${sets.join(", ")} WHERE uid = ?`)
      .bind(...values)
      .run();
  },

  async updatePassword(db: D1Database, uid: string, password: string): Promise<void> {
    await db
      .prepare("UPDATE t_user SET password = ?, updated_at = unixepoch() WHERE uid = ?")
      .bind(password, uid)
      .run();
  },

  async softDelete(db: D1Database, uid: string): Promise<void> {
    await db
      .prepare("UPDATE t_user SET deleted_at = unixepoch(), updated_at = unixepoch() WHERE uid = ?")
      .bind(uid)
      .run();
  },
};

// ==================== 歌曲表 DAO ====================

export const SongDao = {
  async findById(db: D1Database, id: number): Promise<TSong | null> {
    return db
      .prepare("SELECT * FROM t_song WHERE id = ? AND deleted_at IS NULL")
      .bind(id)
      .first<TSong>();
  },

  async findByIds(db: D1Database, ids: number[]): Promise<TSong[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const result = await db
      .prepare(`SELECT * FROM t_song WHERE id IN (${placeholders}) AND deleted_at IS NULL`)
      .bind(...ids)
      .all<TSong>();
    return result.results;
  },

  async search(
    db: D1Database,
    keyword: string,
    options: { page?: number; size?: number; sort?: string } = {}
  ): Promise<{ results: TSong[]; total: number }> {
    const page = options.page ?? 1;
    const size = options.size ?? 20;
    const offset = (page - 1) * size;
    const likeKeyword = `%${keyword}%`;

    const countResult = await db
      .prepare("SELECT COUNT(*) as total FROM t_song WHERE title LIKE ? AND deleted_at IS NULL")
      .bind(likeKeyword)
      .first<{ total: number }>();

    const result = await db
      .prepare("SELECT * FROM t_song WHERE title LIKE ? AND deleted_at IS NULL LIMIT ? OFFSET ?")
      .bind(likeKeyword, size, offset)
      .all<TSong>();

    return { results: result.results, total: countResult?.total ?? 0 };
  },

  async findByCategory(
    db: D1Database,
    options: { genre?: string; language?: string; page?: number; size?: number } = {}
  ): Promise<{ results: TSong[]; total: number }> {
    const page = options.page ?? 1;
    const size = options.size ?? 20;
    const offset = (page - 1) * size;

    const conditions: string[] = ["deleted_at IS NULL"];
    const values: unknown[] = [];

    if (options.genre) {
      conditions.push("genre = ?");
      values.push(options.genre);
    }
    if (options.language) {
      conditions.push("language = ?");
      values.push(options.language);
    }

    const where = conditions.join(" AND ");

    const countResult = await db
      .prepare(`SELECT COUNT(*) as total FROM t_song WHERE ${where}`)
      .bind(...values)
      .first<{ total: number }>();

    const result = await db
      .prepare(`SELECT * FROM t_song WHERE ${where} LIMIT ? OFFSET ?`)
      .bind(...values, size, offset)
      .all<TSong>();

    return { results: result.results, total: countResult?.total ?? 0 };
  },

  async findHot(db: D1Database, limit: number = 50): Promise<TSong[]> {
    const result = await db
      .prepare("SELECT * FROM t_song WHERE deleted_at IS NULL ORDER BY heat DESC LIMIT ?")
      .bind(limit)
      .all<TSong>();
    return result.results;
  },
};

// ==================== 专辑表 DAO ====================

export const AlbumDao = {
  async findById(db: D1Database, id: string): Promise<TAlbum | null> {
    return db
      .prepare("SELECT * FROM t_album WHERE id = ? AND deleted_at IS NULL")
      .bind(id)
      .first<TAlbum>();
  },

  async findByArtistId(db: D1Database, artistId: string): Promise<TAlbum[]> {
    const result = await db
      .prepare("SELECT * FROM t_album WHERE artist_id = ? AND deleted_at IS NULL")
      .bind(artistId)
      .all<TAlbum>();
    return result.results;
  },
};

// ==================== 歌手表 DAO ====================

export const ArtistDao = {
  async findById(db: D1Database, id: string): Promise<TArtist | null> {
    return db
      .prepare("SELECT * FROM t_artist WHERE id = ? AND deleted_at IS NULL")
      .bind(id)
      .first<TArtist>();
  },

  async search(db: D1Database, keyword: string, limit: number = 20): Promise<TArtist[]> {
    const result = await db
      .prepare("SELECT * FROM t_artist WHERE name LIKE ? AND deleted_at IS NULL LIMIT ?")
      .bind(`%${keyword}%`, limit)
      .all<TArtist>();
    return result.results;
  },
};

// ==================== 歌单表 DAO ====================

export const PlaylistDao = {
  async findById(db: D1Database, id: string): Promise<TPlaylist | null> {
    return db
      .prepare("SELECT * FROM t_playlist WHERE id = ? AND deleted_at IS NULL")
      .bind(id)
      .first<TPlaylist>();
  },

  async findByCreatorUid(db: D1Database, uid: string): Promise<TPlaylist[]> {
    const result = await db
      .prepare("SELECT * FROM t_playlist WHERE creator_uid = ? AND deleted_at IS NULL ORDER BY created_at DESC")
      .bind(uid)
      .all<TPlaylist>();
    return result.results;
  },

  async create(
    db: D1Database,
    data: { id: string; name: string; cover?: string; description?: string; creator_uid: string }
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .prepare(
        "INSERT INTO t_playlist (id, name, cover, description, creator_uid, song_count, play_count, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, 1, ?, ?)"
      )
      .bind(data.id, data.name, data.cover ?? "", data.description ?? "", data.creator_uid, now, now)
      .run();
  },

  async update(
    db: D1Database,
    id: string,
    fields: Partial<Pick<TPlaylist, "name" | "cover" | "description">>
  ): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.name !== undefined) { sets.push("name = ?"); values.push(fields.name); }
    if (fields.cover !== undefined) { sets.push("cover = ?"); values.push(fields.cover); }
    if (fields.description !== undefined) { sets.push("description = ?"); values.push(fields.description); }

    if (sets.length === 0) return;

    sets.push("updated_at = unixepoch()");
    values.push(id);

    await db
      .prepare(`UPDATE t_playlist SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  },

  async softDelete(db: D1Database, id: string): Promise<void> {
    await db
      .prepare("UPDATE t_playlist SET deleted_at = unixepoch(), updated_at = unixepoch() WHERE id = ?")
      .bind(id)
      .run();
  },

  async incrementPlayCount(db: D1Database, id: string): Promise<void> {
    await db
      .prepare("UPDATE t_playlist SET play_count = play_count + 1, updated_at = unixepoch() WHERE id = ?")
      .bind(id)
      .run();
  },

  async updateSongCount(db: D1Database, id: string): Promise<void> {
    await db
      .prepare(
        "UPDATE t_playlist SET song_count = (SELECT COUNT(*) FROM t_playlist_song WHERE playlist_id = ?), updated_at = unixepoch() WHERE id = ?"
      )
      .bind(id, id)
      .run();
  },
};

// ==================== 歌单歌曲关联表 DAO ====================

export const PlaylistSongDao = {
  async findByPlaylistId(db: D1Database, playlistId: string): Promise<TPlaylistSong[]> {
    const result = await db
      .prepare("SELECT * FROM t_playlist_song WHERE playlist_id = ? ORDER BY sort_order ASC")
      .bind(playlistId)
      .all<TPlaylistSong>();
    return result.results;
  },

  async getSongIds(db: D1Database, playlistId: string): Promise<number[]> {
    const result = await db
      .prepare("SELECT song_id FROM t_playlist_song WHERE playlist_id = ? ORDER BY sort_order ASC")
      .bind(playlistId)
      .all<{ song_id: number }>();
    return result.results.map((r) => r.song_id);
  },

  async addSongs(db: D1Database, playlistId: string, songIds: number[]): Promise<{ added: number[]; duplicated: number[] }> {
    const existing = await this.getSongIds(db, playlistId);
    const existingSet = new Set(existing);
    const added: number[] = [];
    const duplicated: number[] = [];

    // 获取当前最大 sort_order
    const maxResult = await db
      .prepare("SELECT MAX(sort_order) as max_order FROM t_playlist_song WHERE playlist_id = ?")
      .bind(playlistId)
      .first<{ max_order: number | null }>();
    let sortOrder = (maxResult?.max_order ?? 0) + 1;

    for (const songId of songIds) {
      if (existingSet.has(songId)) {
        duplicated.push(songId);
      } else {
        await db
          .prepare("INSERT INTO t_playlist_song (playlist_id, song_id, sort_order, added_at) VALUES (?, ?, ?, unixepoch())")
          .bind(playlistId, songId, sortOrder++)
          .run();
        added.push(songId);
      }
    }

    return { added, duplicated };
  },

  async removeSongs(db: D1Database, playlistId: string, songIds: number[]): Promise<void> {
    const placeholders = songIds.map(() => "?").join(",");
    await db
      .prepare(`DELETE FROM t_playlist_song WHERE playlist_id = ? AND song_id IN (${placeholders})`)
      .bind(playlistId, ...songIds)
      .run();
  },

  async updateSortOrder(db: D1Database, playlistId: string, songIds: number[]): Promise<void> {
    for (let i = 0; i < songIds.length; i++) {
      await db
        .prepare("UPDATE t_playlist_song SET sort_order = ? WHERE playlist_id = ? AND song_id = ?")
        .bind(i + 1, playlistId, songIds[i])
        .run();
    }
  },
};

// ==================== 收藏表 DAO ====================

export const CollectionDao = {
  async findFavorites(db: D1Database, uid: string): Promise<number[]> {
    const result = await db
      .prepare("SELECT target_id FROM t_collection WHERE uid = ? AND target_type = 'song' ORDER BY created_at DESC")
      .bind(uid)
      .all<{ target_id: string }>();
    return result.results.map((r) => Number(r.target_id));
  },

  async findCollectedPlaylistIds(db: D1Database, uid: string): Promise<string[]> {
    const result = await db
      .prepare("SELECT target_id FROM t_collection WHERE uid = ? AND target_type = 'playlist' ORDER BY created_at DESC")
      .bind(uid)
      .all<{ target_id: string }>();
    return result.results.map((r) => r.target_id);
  },

  async addFavorite(db: D1Database, uid: string, songId: number): Promise<void> {
    await db
      .prepare("INSERT OR IGNORE INTO t_collection (uid, target_type, target_id, created_at) VALUES (?, 'song', ?, unixepoch())")
      .bind(uid, String(songId))
      .run();
  },

  async removeFavorite(db: D1Database, uid: string, songId: number): Promise<void> {
    await db
      .prepare("DELETE FROM t_collection WHERE uid = ? AND target_type = 'song' AND target_id = ?")
      .bind(uid, String(songId))
      .run();
  },

  async collectPlaylist(db: D1Database, uid: string, playlistId: string): Promise<void> {
    await db
      .prepare("INSERT OR IGNORE INTO t_collection (uid, target_type, target_id, created_at) VALUES (?, 'playlist', ?, unixepoch())")
      .bind(uid, playlistId)
      .run();
  },

  async uncollectPlaylist(db: D1Database, uid: string, playlistId: string): Promise<void> {
    await db
      .prepare("DELETE FROM t_collection WHERE uid = ? AND target_type = 'playlist' AND target_id = ?")
      .bind(uid, playlistId)
      .run();
  },
};

// ==================== 播放历史表 DAO ====================

export const PlayHistoryDao = {
  async findByUid(db: D1Database, uid: string, limit: number = 100): Promise<TPlayHistory[]> {
    const result = await db
      .prepare("SELECT * FROM t_play_history WHERE uid = ? ORDER BY last_played_at DESC LIMIT ?")
      .bind(uid, limit)
      .all<TPlayHistory>();
    return result.results;
  },

  async upsert(db: D1Database, uid: string, songId: number, progress: number = 0): Promise<void> {
    await db
      .prepare(
        `INSERT INTO t_play_history (uid, song_id, play_count, progress, last_played_at)
         VALUES (?, ?, 1, ?, unixepoch())
         ON CONFLICT(uid, song_id) DO UPDATE SET
           play_count = play_count + 1,
           progress = excluded.progress,
           last_played_at = excluded.last_played_at`
      )
      .bind(uid, songId, progress)
      .run();
  },

  async clearByUid(db: D1Database, uid: string): Promise<void> {
    await db
      .prepare("DELETE FROM t_play_history WHERE uid = ?")
      .bind(uid)
      .run();
  },
};

// ==================== 用户设置表 DAO ====================

export const UserSettingsDao = {
  async findByUid(db: D1Database, uid: string): Promise<TUserSettings | null> {
    return db
      .prepare("SELECT * FROM t_user_settings WHERE uid = ?")
      .bind(uid)
      .first<TUserSettings>();
  },

  async upsert(db: D1Database, uid: string, settings: Partial<Omit<TUserSettings, "uid" | "updated_at">>): Promise<void> {
    await db
      .prepare(
        `INSERT OR REPLACE INTO t_user_settings (uid, cache_size, playback_rate, quality, auto_play, theme, lyric_font_size, lyric_translation, public_history, allow_recommend, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
      )
      .bind(
        uid,
        settings.cache_size ?? 2048,
        settings.playback_rate ?? 1,
        settings.quality ?? "standard",
        settings.auto_play ?? 0,
        settings.theme ?? "system",
        settings.lyric_font_size ?? 16,
        settings.lyric_translation ?? 1,
        settings.public_history ?? 0,
        settings.allow_recommend ?? 1
      )
      .run();
  },
};

// ==================== 反馈表 DAO ====================

export const FeedbackDao = {
  async create(db: D1Database, data: { uid: string; content: string; contact?: string; screenshot?: string }): Promise<number> {
    const result = await db
      .prepare("INSERT INTO t_feedback (uid, content, contact, screenshot, status, created_at) VALUES (?, ?, ?, ?, 'pending', unixepoch())")
      .bind(data.uid, data.content, data.contact ?? "", data.screenshot ?? "")
      .run();
    return result.meta.last_row_id;
  },
};

// ==================== 搜索日志表 DAO ====================

export const SearchLogDao = {
  async create(db: D1Database, data: { uid: string; keyword: string; resultCount?: number }): Promise<void> {
    await db
      .prepare("INSERT INTO t_search_log (uid, keyword, result_count, created_at) VALUES (?, ?, ?, unixepoch())")
      .bind(data.uid, data.keyword, data.resultCount ?? 0)
      .run();
  },

  async findHotKeywords(db: D1Database, limit: number = 20): Promise<{ keyword: string; count: number }[]> {
    const result = await db
      .prepare(
        "SELECT keyword, COUNT(*) as count FROM t_search_log WHERE created_at > unixepoch() - 86400 GROUP BY keyword ORDER BY count DESC LIMIT ?"
      )
      .bind(limit)
      .all<{ keyword: string; count: number }>();
    return result.results;
  },
};

// ==================== 第三方授权表 DAO ====================

export const OauthDao = {
  async findByProvider(db: D1Database, provider: string, providerUid: string): Promise<TOauth | null> {
    return db
      .prepare("SELECT * FROM t_oauth WHERE provider = ? AND provider_uid = ?")
      .bind(provider, providerUid)
      .first<TOauth>();
  },

  async findByUid(db: D1Database, uid: string): Promise<TOauth[]> {
    const result = await db
      .prepare("SELECT * FROM t_oauth WHERE uid = ?")
      .bind(uid)
      .all<TOauth>();
    return result.results;
  },

  async create(db: D1Database, data: { uid: string; provider: string; provider_uid: string; access_token?: string; refresh_token?: string; expires_at?: number }): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .prepare(
        "INSERT INTO t_oauth (uid, provider, provider_uid, access_token, refresh_token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(data.uid, data.provider, data.provider_uid, data.access_token ?? "", data.refresh_token ?? "", data.expires_at ?? 0, now, now)
      .run();
  },
};

// ==================== 短信验证码表 DAO ====================

export const SmsCodeDao = {
  async findLatest(db: D1Database, phone: string, type: string): Promise<TSmsCode | null> {
    return db
      .prepare("SELECT * FROM t_sms_code WHERE phone = ? AND type = ? ORDER BY created_at DESC LIMIT 1")
      .bind(phone, type)
      .first<TSmsCode>();
  },

  async findRecentInPeriod(db: D1Database, phone: string, type: string, secondsAgo: number): Promise<TSmsCode | null> {
    const cutoff = Math.floor(Date.now() / 1000) - secondsAgo;
    return db
      .prepare("SELECT id FROM t_sms_code WHERE phone = ? AND type = ? AND created_at > ?")
      .bind(phone, type, cutoff)
      .first<TSmsCode>();
  },

  async create(db: D1Database, data: { phone: string; code: string; type: string; expires_at: number }): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .prepare("INSERT INTO t_sms_code (phone, code, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(data.phone, data.code, data.type, data.expires_at, now)
      .run();
  },

  async deleteById(db: D1Database, id: number): Promise<void> {
    await db
      .prepare("DELETE FROM t_sms_code WHERE id = ?")
      .bind(id)
      .run();
  },
};

// ==================== Token 表 DAO ====================

export const TokenDao = {
  async findByAccessToken(db: D1Database, accessToken: string): Promise<TToken | null> {
    return db
      .prepare("SELECT * FROM t_token WHERE access_token = ?")
      .bind(accessToken)
      .first<TToken>();
  },

  async findByRefreshToken(db: D1Database, refreshToken: string): Promise<TToken | null> {
    return db
      .prepare("SELECT * FROM t_token WHERE refresh_token = ?")
      .bind(refreshToken)
      .first<TToken>();
  },

  async create(db: D1Database, data: { uid: string; access_token: string; refresh_token: string; access_expires_at: number; refresh_expires_at: number }): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .prepare(
        "INSERT INTO t_token (uid, access_token, refresh_token, access_expires_at, refresh_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(data.uid, data.access_token, data.refresh_token, data.access_expires_at, data.refresh_expires_at, now)
      .run();
  },

  async deleteById(db: D1Database, id: number): Promise<void> {
    await db
      .prepare("DELETE FROM t_token WHERE id = ?")
      .bind(id)
      .run();
  },

  async deleteByRefreshToken(db: D1Database, refreshToken: string): Promise<void> {
    await db
      .prepare("DELETE FROM t_token WHERE refresh_token = ?")
      .bind(refreshToken)
      .run();
  },

  async deleteByUid(db: D1Database, uid: string): Promise<void> {
    await db
      .prepare("DELETE FROM t_token WHERE uid = ?")
      .bind(uid)
      .run();
  },
};
