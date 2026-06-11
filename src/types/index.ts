export interface Song {
  id: number;
  title: string;
  artist: string;
  cover: string;
  src: string;
  duration: number;
  neteaseId?: number;
  isLoading?: boolean;
  isFavorite?: boolean;
  heat?: number;
  categoryId?: string;
  /** PRD 6.4：歌曲是否已下架 */
  isDelisted?: boolean;
}

export type ThemeName =
  | "purple"
  | "ocean"
  | "sunset"
  | "forest"
  | "rose"
  | "midnight"
  | "black";

export type ThemeMode = "day" | "night";

export type DayThemeName = "mint" | "peach" | "sky" | "lavender" | "sand" | "rose";

export interface PlayerState {
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  songs: Song[];
  isLoadingSongs: boolean;
}

export interface LyricLine {
  time: number;
  text: string;
}

export type PlayMode = "sequential" | "loop" | "shuffle";

// 音质 - PRD 3.2.4
// 注意：会员功能已取消，所有用户均可使用全部音质
export type AudioQuality = "standard" | "high" | "lossless";

export const QUALITY_META: Record<
  AudioQuality,
  { label: string; level: "standard" | "high" | "lossless"; bitrate: string }
> = {
  standard: { label: "标准", level: "standard", bitrate: "128 kbps" },
  high: { label: "高清", level: "high", bitrate: "320 kbps" },
  lossless: { label: "无损", level: "lossless", bitrate: "FLAC · 24bit/192kHz" },
};

export interface PlayReport {
  songId: number;
  playTime: number;
  progress: number;
  device: string;
  quality: AudioQuality;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  cover: string;
  accent: string;
}

export interface Ranking {
  id: string;
  name: string;
  description: string;
  cover: string;
  accent: string;
  query: string;
  playlistId: string;
}

export interface Playlist {
  /** 歌单唯一 ID，前端生成的本地 ID */
  id: string;
  /** 歌单名称（1-30 字） */
  name: string;
  /** 歌单内歌曲 ID 列表（去重） */
  songIds: number[];
  /** 封面 URL；可选 */
  cover?: string;
  /** 歌单简介（0-200 字） */
  description?: string;
  /** 创建者 UID；本地创建时为 undefined */
  creatorUid?: string;
  /** 创建者昵称；显示用 */
  creatorName?: string;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 更新时间戳（毫秒） */
  updatedAt: number;
  /** 是否已被当前用户收藏 */
  isCollected?: boolean;
  /** 歌单类型：created=我创建、collected=我收藏、recommended=系统推荐 */
  source?: "created" | "collected" | "recommended";
  /** 播放次数（展示用） */
  playCount?: number;
}

/** PRD 3.4.5 / 4.3.5：单个歌单最多 1000 首歌曲（C4 修订） */
export const PLAYLIST_MAX_SONGS = 1000;
/** PRD 3.4.1：歌单名称 1-30 字 */
export const PLAYLIST_NAME_MIN = 1;
export const PLAYLIST_NAME_MAX = 30;
/** PRD 4.3.5：歌单简介最多 200 字 */
export const PLAYLIST_DESC_MAX = 200;

/** 收藏目标类型 - PRD 4.3.7 t_collection */
export type CollectionTargetType = "playlist" | "song";

/** 后端歌单创建响应 */
export interface CreatePlaylistResponse {
  playlistId: string;
}

/** 后端添加歌曲响应：去重返回（PRD 3.4.5） */
export interface AddSongsResponse {
  added: number[];
  duplicated: number[];
}

// 用户认证相关类型
export interface UserInfo {
  uid: string;
  phone?: string;
  account?: string;
  nickname: string;
  avatar?: string;
  signature?: string;
}

export type AuthModalView = "login" | "register" | "resetPassword";

/* =========================================================
 * 模块 8 设置中心 - PRD 3.8 / 评审纪要
 * ========================================================= */

/** 主题偏好 - PRD 3.8.2：深色 / 浅色 / 跟随系统（3 选 1） */
export type ThemePreference = "light" | "dark" | "system";

/** 隐私设置 - PRD 3.8.3 */
export interface PrivacySettings {
  /** 播放记录是否对其他用户公开 */
  publicHistory: boolean;
  /** 是否允许基于历史/收藏进行个性化推荐 */
  allowRecommend: boolean;
}

/** 用户设置聚合 - PRD 3.8.1 / 3.8.2 / 3.8.3 / 4.3.9 t_user_settings */
export interface AppSettings {
  /** 缓存上限 (MB) - 默认 2048，0.5-10GB */
  cacheSize: number;
  /** 播放速度 (0.5/0.75/1/1.25/1.5/2) */
  playbackRate: number;
  /** 音质优先 */
  quality: AudioQuality;
  /** 启动自动播放 - PRD 3.8.1 */
  autoPlay: boolean;
  /** 主题偏好 */
  theme: ThemePreference;
  /** 歌词字号 (12-24 px) - PRD 3.8.2 */
  lyricFontSize: number;
  /** 歌词翻译开关 - PRD 3.8.2 */
  lyricTranslation: boolean;
  /** 隐私设置 */
  privacy: PrivacySettings;
}

/** PRD 3.8.1 设置项枚举默认值 */
export const SETTINGS_DEFAULTS: AppSettings = {
  cacheSize: 2048,
  playbackRate: 1,
  quality: "lossless",
  autoPlay: false,
  theme: "system",
  lyricFontSize: 16,
  lyricTranslation: true,
  privacy: {
    publicHistory: false,
    allowRecommend: true,
  },
};

/** 播放速度候选 - PRD 3.8.1 */
export const PLAYBACK_RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
/** 缓存大小上下限 (MB) - PRD 3.8.1 */
export const CACHE_SIZE_MIN_MB = 512;
export const CACHE_SIZE_MAX_MB = 10240;
/** 歌词字号上下限 (px) - PRD 3.8.2 */
export const LYRIC_FONT_MIN = 12;
export const LYRIC_FONT_MAX = 24;

/** 反馈提交参数 - PRD 3.8.4 / 3.8.5 */
export interface FeedbackPayload {
  content: string;
  contact?: string;
  screenshot?: string;
}

// ========== 模块 6：个性化推荐 (PRD 3.6) ==========

/** 推荐歌单 / 专辑卡片数据 - PRD 3.6.1 猜你喜欢 */
export interface RecommendPlaylist {
  /** 推荐项 ID（歌单或专辑） */
  id: string;
  /** 名称 */
  name: string;
  /** 类型 */
  type: "playlist" | "album";
  /** 封面 URL */
  cover: string;
  /** 描述 */
  description?: string;
  /** 创作者 / 歌手 */
  creator?: string;
  /** 推荐理由（基于算法权重） */
  reason?: string;
  /** 播放量（展示用） */
  playCount?: number;
  /** 歌曲数量 */
  songCount?: number;
  /** 强调色 */
  accent: string;
  /** 推荐得分 0-1（用于排序展示） */
  score: number;
}

/** 推荐算法权重 - PRD 3.6.2 */
export interface RecommendWeights {
  /** 播放历史 40% */
  history: number;
  /** 收藏/喜欢 30% */
  favorite: number;
  /** 搜索记录 15% */
  search: number;
  /** 主动偏好 15% */
  preference: number;
}

export const DEFAULT_RECOMMEND_WEIGHTS: RecommendWeights = {
  history: 0.4,
  favorite: 0.3,
  search: 0.15,
  preference: 0.15,
};

/** 私人 FM 单曲（带"换一首"原因） */
export interface FmSong extends Song {
  /** 推荐来源标识（基于历史/基于收藏/基于偏好/冷启动） */
  source: "history" | "favorite" | "search" | "preference" | "cold-start";
  /** 推荐理由（展示给用户的文案） */
  reason: string;
}

/** 每日推荐刷新记录 */
export interface DailyRecommendCache {
  /** yyyy-mm-dd 日期 */
  date: string;
  /** 推荐歌曲 ID 列表 */
  songIds: number[];
  /** 缓存生成时间戳 */
  generatedAt: number;
}

/** 偏好标签 - PRD 3.6.2 主动偏好 */
export type PreferenceTag =
  | "古风"
  | "流行"
  | "民谣"
  | "摇滚"
  | "说唱"
  | "电子"
  | "R&B"
  | "古典"
  | "轻音乐"
  | "治愈"
  | "伤感"
  | "运动"
  | "通勤"
  | "学习"
  | "睡前"
  | "K歌";

export const PREFERENCE_TAGS: PreferenceTag[] = [
  "古风",
  "流行",
  "民谣",
  "摇滚",
  "说唱",
  "电子",
  "R&B",
  "古典",
  "轻音乐",
  "治愈",
  "伤感",
  "运动",
  "通勤",
  "学习",
  "睡前",
  "K歌",
];

/** 推荐区域状态 */
export type RecommendStatus = "idle" | "loading" | "ready" | "error";

/* =========================================================
 * 模块 7 会员中心 - PRD 3.7.3
 * 备注：会员功能已下线，前端仍保留类型与本地服务代码以兼容既有数据
 * ========================================================= */

/** 会员等级 */
export type MemberLevel = "normal" | "vip" | "svip";

/** 订阅周期 */
export type MemberCycle = "month" | "quarter" | "year";

/** 订单状态 */
export type MemberOrderStatus = "pending" | "paid" | "cancelled";

/** 会员权益 Key */
export type MemberRightKey =
  | "lossless"
  | "spatialAudio"
  | "aiRecommend"
  | "unlimitedDownloads";

/** 单项权益元数据 */
export interface MemberRightMeta {
  /** 享受该权益所需的最低会员等级 */
  minMember: MemberLevel;
  /** 权益名称（展示用） */
  label: string;
  /** 权益说明（展示用） */
  description: string;
}

/** 权益元数据字典 */
export const MEMBER_RIGHT_META: Record<MemberRightKey, MemberRightMeta> = {
  lossless: {
    minMember: "vip",
    label: "无损音质",
    description: "畅听 FLAC 无损音源",
  },
  spatialAudio: {
    minMember: "svip",
    label: "空间音频",
    description: "沉浸式环绕听感",
  },
  aiRecommend: {
    minMember: "vip",
    label: "AI 智能推荐",
    description: "更懂你口味的歌单",
  },
  unlimitedDownloads: {
    minMember: "svip",
    label: "无限下载",
    description: "离线畅听不受限",
  },
};

/** 会员套餐 */
export interface MemberPlan {
  id: string;
  name: string;
  level: MemberLevel;
  cycle: MemberCycle;
  /** 价格（分） */
  price: number;
  description?: string;
  badge?: string;
}

/** 默认会员套餐（VIP / SVIP × 月/季/年） */
export const MEMBER_PLANS: MemberPlan[] = [
  { id: "vip-month",    name: "VIP 月卡",   level: "vip",  cycle: "month",   price: 1500 },
  { id: "vip-quarter",  name: "VIP 季卡",   level: "vip",  cycle: "quarter", price: 3900, badge: "省 600" },
  { id: "vip-year",     name: "VIP 年卡",   level: "vip",  cycle: "year",    price: 13800, badge: "省 4200" },
  { id: "svip-month",   name: "SVIP 月卡",  level: "svip", cycle: "month",   price: 2500 },
  { id: "svip-quarter", name: "SVIP 季卡",  level: "svip", cycle: "quarter", price: 6900, badge: "省 600" },
  { id: "svip-year",    name: "SVIP 年卡",  level: "svip", cycle: "year",    price: 25800, badge: "省 4200" },
];

/** 用户会员信息（PRD 3.7.3） */
export interface MemberInfo {
  uid: string;
  level: MemberLevel;
  /** 到期时间戳（毫秒），0 = 未开通 */
  expireTime: number;
  /** 是否自动续费（0/1） */
  autoRenew: number;
  /** 开通时间戳（毫秒） */
  createdAt: number;
  /** 已开通的权益 Key 列表 */
  rights: MemberRightKey[];
}

/** 会员订单 */
export interface MemberOrder {
  orderNo: string;
  planId: string;
  level: MemberLevel;
  cycle: MemberCycle;
  amount: number;
  paymentMethod: string;
  status: MemberOrderStatus;
  createdAt: number;
  paidAt?: number;
  effectiveUntil?: number;
}

/** 订阅请求（POST /api/member/subscribe） */
export interface SubscribeRequest {
  planId: string;
  paymentMethod: string;
}

/** 订阅响应 */
export interface SubscribeResponse {
  orderId: string;
  orderNo: string;
  amount: number;
  payUrl: string;
}

/** 支付回调请求（POST /api/member/pay/callback） */
export interface PayCallbackPayload {
  orderNo: string;
  status: "success" | "fail" | "cancelled";
  paymentMethod?: string;
  transactionId?: string;
}
