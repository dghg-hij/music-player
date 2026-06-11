import { create } from "zustand";
import SONG_QUERIES from "../data/songs";
import {
  searchSongs,
  getSongUrl,
  getSongLyric,
  parseLRC,
  getHotSongs,
  getDailyRecommend,
  getFmSong,
  getGuessYouLike,
} from "../services/musicApi";
import {
  createPlaylistRemote,
  updatePlaylistRemote,
  deletePlaylistRemote,
  collectPlaylistRemote,
  uncollectPlaylistRemote,
} from "../services/playlistApi";
// PRD 4 后端整体设计：以下导入为 remote API 模式预留
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  useRemoteApi,
  SONG_ENDPOINTS,
  SEARCH_ENDPOINTS,
  PLAYLIST_ENDPOINTS,
  USER_ENDPOINTS,
  RECOMMEND_ENDPOINTS,
} from "../services/apiClient";
/* eslint-enable @typescript-eslint/no-unused-vars */
import type {
  Song,
  LyricLine,
  PlayMode,
  ThemeName,
  ThemeMode,
  DayThemeName,
  Playlist,
  AudioQuality,
  RecommendPlaylist,
  FmSong,
  PreferenceTag,
  RecommendWeights,
  RecommendStatus,
  ThemePreference,
  PrivacySettings,
  AddSongsResponse,
} from "../types";
import { DEFAULT_RECOMMEND_WEIGHTS } from "../types";
import { PLAYLIST_MAX_SONGS, SETTINGS_DEFAULTS } from "../types";

interface PlayerStore {
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  songs: Song[];
  isLoadingSongs: boolean;
  lyrics: LyricLine[];
  currentLyricIndex: number;
  showLyrics: boolean;
  searchResults: Song[];
  isSearchMode: boolean;
  playMode: PlayMode;
  showFavorites: boolean;
  hotSongs: Song[];
  isLoadingHot: boolean;
  showHotChart: boolean;
  theme: ThemeName;
  queue: Song[];
  queues: Song[][];
  activeQueueIndex: number;
  showQueue: boolean;
  playTrigger: number;

  // 新增状态
  themeMode: ThemeMode;
  dayTheme: DayThemeName;
  downloads: number[];
  recentPlays: number[];
  playlists: Playlist[];
  /** 我收藏的歌单 id 列表 - PRD 3.5.1 */
  collectedPlaylists: string[];

  // 模块 2 新增：音质 / 播放历史栈
  quality: AudioQuality;
  /** B1 修正：随机模式下"上一曲"用此栈返回真正的上一首 */
  playHistory: number[];
  /** 全局 Toast 信息（PRD 3.2.5 步骤2） */
  toast: { id: number; message: string; type?: "info" | "success" | "warning" | "error" } | null;

  /* ============ PRD 6 异常处理状态 ============ */
  /** 网络是否在线 - PRD 6.1 */
  isOnline: boolean;
  /** 音频加载重试计数（当前歌曲） - PRD 6.2 */
  audioRetryCount: number;
  /** 歌曲下架标记（songId set） - PRD 6.4 */
  takenDownSongIds: Set<number>;
  /** 断点续播进度记录（songId → 秒） - PRD 6.2 */
  resumeProgress: Record<number, number>;
  /** 上次播放的歌曲索引 - PRD 5.3 断点续播 */
  lastSongIndex: number;
  /** 上次播放的进度（秒） - PRD 5.3 断点续播 */
  lastProgress: number;

  /* ============ 模块 8 设置中心 - PRD 3.8 ============ */
  /** 缓存上限 (MB) - PRD 3.8.1，默认 2048 */
  cacheSize: number;
  /** 启动自动播放 - PRD 3.8.1 */
  autoPlay: boolean;
  /** 主题偏好（light/dark/system） - PRD 3.8.2 */
  themePreference: ThemePreference;
  /** 歌词字号 (12-24px) - PRD 3.8.2 */
  lyricFontSize: number;
  /** 歌词翻译开关 - PRD 3.8.2 */
  lyricTranslation: boolean;
  /** 隐私设置 - PRD 3.8.3 */
  privacy: PrivacySettings;
  /** 当前缓存占用估算 (MB) - 由设置中心读取 */
  cacheUsed: number;

  setCurrentSongIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  playNext: () => void;
  playPrev: () => void;
  selectSong: (index: number) => void;
  setSongs: (songs: Song[]) => void;
  updateSongSrc: (index: number, src: string) => void;
  fetchSongsFromApi: () => Promise<void>;
  ensureSongSrc: (index: number) => Promise<void>;
  fetchLyrics: (neteaseId: number) => Promise<void>;
  updateCurrentLyricIndex: () => void;
  toggleShowLyrics: () => void;
  importLocalFiles: (files: FileList) => void;
  setSearchResults: (results: Song[]) => void;
  clearSearch: () => void;
  playSearchResult: (song: Song) => void;
  togglePlayMode: () => void;
  toggleFavorite: (index: number) => void;
  toggleFavoriteById: (id: number) => void;
  toggleShowFavorites: () => void;
  fetchHotSongs: (forceRefresh?: boolean) => Promise<void>;
  toggleShowHotChart: () => void;
  playHotSong: (song: Song) => void;
  setTheme: (theme: ThemeName) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (id: number) => void;
  clearQueue: () => void;
  playFromQueue: (id: number) => void;
  setActiveQueueIndex: (index: number) => void;
  toggleShowQueue: () => void;

  // 新增 actions
  setThemeMode: (mode: ThemeMode) => void;
  setDayTheme: (theme: DayThemeName) => void;
  downloadSong: (songId: number) => void;
  isDownloaded: (songId: number) => boolean;
  removeDownload: (songId: number) => void;
  /** 批量移除下载 - PRD 3.5.4 */
  removeDownloads: (songIds: number[]) => void;
  addToRecent: (songId: number) => void;
  clearRecent: () => void;
  createPlaylist: (params: { name: string; cover?: string; description?: string } | string) => string;
  addSongToPlaylist: (playlistId: string, songId: number) => { added: boolean; duplicated: boolean; full: boolean };
  /** 批量加入 - 返回 added/duplicated（PRD 3.4.5） */
  addSongsToPlaylist: (playlistId: string, songIds: number[]) => AddSongsResponse;
  removeSongFromPlaylist: (playlistId: string, songId: number) => void;
  /** 批量移除歌单内歌曲 */
  removeSongsFromPlaylist: (playlistId: string, songIds: number[]) => void;
  /** 拖拽排序 - from/to 均为 songIds 在当前列表的索引 */
  reorderPlaylistSongs: (playlistId: string, fromIndex: number, toIndex: number) => void;
  /** 编辑歌单（名称/封面/简介） - PRD 3.4.3 */
  updatePlaylist: (playlistId: string, patch: { name?: string; cover?: string; description?: string }) => void;
  /** 删除歌单 - PRD 3.4.3 */
  deletePlaylist: (playlistId: string) => void;
  /** 收藏/取消收藏歌单 - PRD 3.4.4 */
  toggleCollectPlaylist: (playlistId: string) => void;
  isCollectedPlaylist: (playlistId: string) => boolean;
  getPlaylistById: (playlistId: string) => Playlist | undefined;
  playSong: (song: Song) => void;
  playSongById: (songId: number) => void;

  // 模块 2 新增 actions
  setQuality: (q: AudioQuality) => void;
  pushPlayHistory: (index: number) => void;
  popPlayHistory: () => number | undefined;
  showToast: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  clearToast: () => void;

  /* ============ PRD 6 异常处理 actions ============ */
  /** 设置网络在线状态 - PRD 6.1 */
  setIsOnline: (online: boolean) => void;
  /** 音频加载失败重试 - PRD 6.2：重试3次后跳过下一首 */
  retryAudioLoad: () => void;
  /** 重置重试计数（切歌时调用） */
  resetAudioRetryCount: () => void;
  /** 标记歌曲已下架 - PRD 6.4 */
  markSongTakenDown: (songId: number) => void;
  /** 检查歌曲是否已下架 - PRD 6.4 */
  isSongTakenDown: (songId: number) => boolean;
  /** 保存断点续播进度 - PRD 6.2 */
  saveResumeProgress: (songId: number, progress: number) => void;
  /** 读取断点续播进度 - PRD 6.2 */
  getResumeProgress: (songId: number) => number;
  /** 清除断点进度 - PRD 6.2 */
  clearResumeProgress: (songId: number) => void;

  /* ============ 模块 8 设置中心 actions ============ */
  setCacheSize: (size: number) => void;
  setAutoPlay: (enabled: boolean) => void;
  setThemePreference: (pref: ThemePreference) => void;
  setLyricFontSize: (size: number) => void;
  setLyricTranslation: (enabled: boolean) => void;
  setPrivacy: (patch: Partial<PrivacySettings>) => void;
  /** 清空本地缓存 - PRD 3.8.1 */
  clearLocalCache: () => void;
  /** 重置设置为默认值 - PRD 7.1 验收 */
  resetSettings: () => void;
  /** 估算并刷新缓存占用 */
  refreshCacheUsage: () => void;

  /* ============ 模块 6 个性化推荐 (PRD 3.6) ============ */
  /** 每日推荐歌曲列表 */
  dailyRecommend: Song[];
  /** 每日推荐状态 */
  dailyRecommendStatus: RecommendStatus;
  /** 每日推荐对应的日期 yyyy-mm-dd */
  dailyRecommendDate: string;
  /** 私人 FM 队列 */
  fmQueue: FmSong[];
  /** 私人 FM 已播放历史（用于"上一首"） */
  fmPlayed: FmSong[];
  /** 私人 FM 当前正在播放/等待播放的索引 */
  fmCurrentIndex: number;
  /** 私人 FM 状态 */
  fmStatus: RecommendStatus;
  /** 当前播放的 FM 歌曲推荐原因 */
  fmCurrentReason: string;
  /** 猜你喜欢歌单/专辑列表 */
  guessPlaylists: RecommendPlaylist[];
  /** 猜你喜欢加载状态 */
  guessStatus: RecommendStatus;
  /** 猜你喜欢分页 */
  guessPage: number;
  /** 猜你喜欢是否还有更多 */
  guessHasMore: boolean;
  /** 用户偏好标签 - PRD 3.6.2 主动偏好 15% */
  preferences: PreferenceTag[];
  /** 用户搜索历史 - PRD 3.6.2 搜索 15% */
  searchHistory: string[];
  /** 推荐算法权重（可调） */
  recommendWeights: RecommendWeights;
  /** 最近一次刷新的日推日期 */

  /** 加载每日推荐 - PRD 3.6.1 / 3.6.3 */
  fetchDailyRecommend: (forceRefresh?: boolean) => Promise<void>;
  /** 播放每日推荐列表中的第 i 首 */
  playDailyRecommendAt: (i: number) => void;
  /** 把每日推荐全部加入待播放 */
  addDailyRecommendToQueue: () => void;

  /** 启动私人 FM（无限流） */
  startFm: () => Promise<void>;
  /** FM 切到下一首 */
  fmNext: () => Promise<void>;
  /** FM 重新开始（清空历史） */
  fmRestart: () => Promise<void>;
  /** FM 不喜欢当前歌曲（直接跳到下一首 + 加入黑名单） */
  fmDislikeCurrent: () => Promise<void>;

  /** 加载猜你喜欢（首屏） */
  fetchGuessYouLike: (reset?: boolean) => Promise<void>;
  /** 猜你喜欢分页加载 */
  loadMoreGuess: () => Promise<void>;

  /** 切换用户偏好标签 */
  togglePreference: (tag: PreferenceTag) => void;
  /** 记录一次搜索（用于推荐算法） */
  recordSearch: (keyword: string) => void;
  /** 设置推荐权重 */
  setRecommendWeights: (w: Partial<RecommendWeights>) => void;

  /** 内部：收集推荐算法所需的关键词（带下划线提示是内部） */
  _collectRecommendKeywords: () => {
    historyKeywords: string[];
    favoriteKeywords: string[];
    searchKeywords: string[];
    preferences: PreferenceTag[];
  };
}

const STORAGE_KEY = "music-player-state";

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(state: Partial<PlayerStore>) {
  try {
    const data = {
      favoriteIds: state.songs?.filter((s: Song) => s.isFavorite).map((s: Song) => s.id) ?? [],
      downloads: state.downloads ?? [],
      recentPlays: state.recentPlays ?? [],
      playlists: state.playlists ?? [],
      collectedPlaylists: state.collectedPlaylists ?? [],
      playMode: state.playMode ?? "sequential",
      volume: state.volume ?? 80,
      playbackRate: state.playbackRate ?? 1,
      theme: state.theme ?? "purple",
      themeMode: state.themeMode ?? "day",
      dayTheme: state.dayTheme ?? "mint",
      queues: state.queues ?? [[], [], []],
      activeQueueIndex: state.activeQueueIndex ?? 0,
      // 模块 8 设置中心 - PRD 3.8
      cacheSize: state.cacheSize ?? SETTINGS_DEFAULTS.cacheSize,
      autoPlay: state.autoPlay ?? SETTINGS_DEFAULTS.autoPlay,
      themePreference: state.themePreference ?? SETTINGS_DEFAULTS.theme,
      lyricFontSize: state.lyricFontSize ?? SETTINGS_DEFAULTS.lyricFontSize,
      lyricTranslation: state.lyricTranslation ?? SETTINGS_DEFAULTS.lyricTranslation,
      privacy: state.privacy ?? SETTINGS_DEFAULTS.privacy,
      // 模块 6 推荐相关
      preferences: state.preferences ?? [],
      searchHistory: state.searchHistory ?? [],
      recommendWeights: state.recommendWeights ?? DEFAULT_RECOMMEND_WEIGHTS,
      // 模块 2 音质（PRD 7.1 验收：用户痕迹持久化）
      quality: state.quality ?? "standard",
      lastSongIndex: state.currentSongIndex ?? 0,
      lastProgress: state.currentTime ?? 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 满或不可用时静默失败
  }
}

const persisted = loadPersistedState();

let nextId = 1000;

const initialSongs: Song[] = SONG_QUERIES.map((q, i) => ({
  id: i + 1,
  title: q.title,
  artist: q.artist,
  cover: "",
  src: "",
  duration: 0,
  neteaseId: 0,
  isLoading: false,
  isFavorite: false,
  categoryId: q.categoryId,
}));

if (persisted?.favoriteIds?.length) {
  const favSet = new Set(persisted.favoriteIds);
  initialSongs.forEach((s) => {
    if (favSet.has(s.id)) s.isFavorite = true;
  });
}

const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSongIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: persisted?.volume ?? 80,
  playbackRate: persisted?.playbackRate ?? 1,
  songs: initialSongs,
  isLoadingSongs: false,
  lyrics: [],
  currentLyricIndex: -1,
  showLyrics: false,
  searchResults: [],
  isSearchMode: false,
  playMode: persisted?.playMode ?? "sequential",
  showFavorites: false,
  hotSongs: [],
  isLoadingHot: false,
  showHotChart: false,
  theme: persisted?.theme ?? "purple",
  queue: persisted?.queues?.[persisted?.activeQueueIndex ?? 0] ?? [],
  queues: persisted?.queues ?? [[], [], []],
  activeQueueIndex: persisted?.activeQueueIndex ?? 0,
  showQueue: false,
  playTrigger: 0,

  // 新增状态初始值
  themeMode: persisted?.themeMode ?? "day",
  dayTheme: persisted?.dayTheme ?? "mint",
  downloads: persisted?.downloads ?? [],
  recentPlays: persisted?.recentPlays ?? [],
  playlists: persisted?.playlists ?? [],
  collectedPlaylists: persisted?.collectedPlaylists ?? [],

  // 模块 2 初始值
  quality: persisted?.quality ?? "lossless",
  playHistory: [],
  toast: null,

  // PRD 6 异常处理初始值
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  audioRetryCount: 0,
  takenDownSongIds: new Set<number>(),
  resumeProgress: {},

  // PRD 5.3 断点续播
  lastSongIndex: persisted?.lastSongIndex ?? -1,
  lastProgress: persisted?.lastProgress ?? 0,

  // 模块 8 设置中心初始值 - PRD 3.8
  cacheSize: persisted?.cacheSize ?? SETTINGS_DEFAULTS.cacheSize,
  autoPlay: persisted?.autoPlay ?? SETTINGS_DEFAULTS.autoPlay,
  themePreference: persisted?.themePreference ?? SETTINGS_DEFAULTS.theme,
  lyricFontSize: persisted?.lyricFontSize ?? SETTINGS_DEFAULTS.lyricFontSize,
  lyricTranslation: persisted?.lyricTranslation ?? SETTINGS_DEFAULTS.lyricTranslation,
  privacy: persisted?.privacy ?? SETTINGS_DEFAULTS.privacy,
  cacheUsed: 0,

  // 模块 6 推荐系统初始值 - PRD 3.6
  dailyRecommend: [],
  dailyRecommendStatus: "idle" as RecommendStatus,
  dailyRecommendDate: "",
  fmQueue: [],
  fmPlayed: [],
  fmCurrentIndex: -1,
  fmStatus: "idle" as RecommendStatus,
  fmCurrentReason: "",
  guessPlaylists: [] as RecommendPlaylist[],
  guessStatus: "idle" as RecommendStatus,
  guessPage: 0,
  guessHasMore: true,
  preferences: [] as PreferenceTag[],
  searchHistory: [] as string[],
  recommendWeights: { ...DEFAULT_RECOMMEND_WEIGHTS } as RecommendWeights,

  setCurrentSongIndex: (index) => set({ currentSongIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time: number) => {
    set({ currentTime: time });
    // 歌词更新：每帧都检查，但只在索引变化时才 setState
    const { lyrics, currentLyricIndex } = get();
    if (lyrics.length === 0) return;
    let newIndex = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (time >= lyrics[i].time) {
        newIndex = i;
        break;
      }
    }
    if (newIndex !== currentLyricIndex) {
      set({ currentLyricIndex: newIndex });
    }
  },
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setSongs: (songs) => set({ songs }),
  updateSongSrc: (index, src) => {
    const songs = [...get().songs];
    if (songs[index]) {
      songs[index] = { ...songs[index], src, isLoading: false };
      set({ songs });
    }
  },
  playNext: () => {
    const { songs, currentSongIndex, playMode, queues, activeQueueIndex, playTrigger, playHistory } = get();
    const queue = queues[activeQueueIndex];

    // 单曲循环：重播当前歌曲
    if (playMode === "loop") {
      set({ isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, playTrigger: playTrigger + 1 });
      get().ensureSongSrc(currentSongIndex);
      return;
    }

    // 待播放列表有歌曲时，优先从队列取
    if (queue.length > 0) {
      let nextSong;
      if (playMode === "shuffle") {
        const randIdx = Math.floor(Math.random() * queue.length);
        nextSong = queue[randIdx];
        const newQueues = [...queues];
        newQueues[activeQueueIndex] = queue.filter((_, i) => i !== randIdx);
        const existIndex = songs.findIndex((s) => s.id === nextSong.id);
        if (existIndex >= 0) {
          set({ currentSongIndex: existIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueues[activeQueueIndex], queues: newQueues, playHistory: [...playHistory, currentSongIndex], playTrigger: playTrigger + 1 });
          get().ensureSongSrc(existIndex);
          get().addToRecent(songs[existIndex].id);
        } else {
          const newSongs = [...songs, nextSong];
          const newIndex = newSongs.length - 1;
          set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueues[activeQueueIndex], queues: newQueues, playHistory: [...playHistory, currentSongIndex], playTrigger: playTrigger + 1 });
          get().ensureSongSrc(newIndex);
          get().addToRecent(nextSong.id);
        }
      } else {
        // 顺序播放：取队列第一首
        nextSong = queue[0];
        const newQueues = [...queues];
        newQueues[activeQueueIndex] = queue.slice(1);
        const existIndex = songs.findIndex((s) => s.id === nextSong.id);
        if (existIndex >= 0) {
          set({ currentSongIndex: existIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueues[activeQueueIndex], queues: newQueues, playHistory: [...playHistory, currentSongIndex], playTrigger: playTrigger + 1 });
          get().ensureSongSrc(existIndex);
          get().addToRecent(songs[existIndex].id);
        } else {
          const newSongs = [...songs, nextSong];
          const newIndex = newSongs.length - 1;
          set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueues[activeQueueIndex], queues: newQueues, playHistory: [...playHistory, currentSongIndex], playTrigger: playTrigger + 1 });
          get().ensureSongSrc(newIndex);
          get().addToRecent(nextSong.id);
        }
      }
      return;
    }

    // 队列为空时，按歌曲列表播放
    let nextIndex: number;
    if (playMode === "shuffle") {
      if (songs.length <= 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * songs.length);
        } while (nextIndex === currentSongIndex);
      }
    } else {
      // 顺序播放：按歌曲列表顺序
      nextIndex = (currentSongIndex + 1) % songs.length;
    }

    set({ currentSongIndex: nextIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, playHistory: [...playHistory, currentSongIndex], playTrigger: playTrigger + 1 });
    get().ensureSongSrc(nextIndex);
    const nextSong = get().songs[nextIndex];
    if (nextSong) get().addToRecent(nextSong.id);
  },
  playPrev: () => {
    const { songs, currentSongIndex, playMode, playHistory, playTrigger } = get();

    let prevIndex: number;
    if (playMode === "shuffle") {
      // B1 修正：随机模式下"上一曲"应回到历史栈中的上一首，而非再随机一首
      if (playHistory.length > 0) {
        prevIndex = playHistory[playHistory.length - 1];
        set({ playHistory: playHistory.slice(0, -1) });
      } else {
        // 历史栈为空，退回到非随机的上一首
        prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
      }
    } else {
      prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    }

    set({ currentSongIndex: prevIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, playTrigger: playTrigger + 1 });
    get().ensureSongSrc(prevIndex);
    const prevSong = get().songs[prevIndex];
    if (prevSong) get().addToRecent(prevSong.id);
  },
  selectSong: (index) => {
    // PRD 6.4：歌曲下架检查
    const selectedSong = get().songs[index];
    if (selectedSong?.isDelisted) {
      get().showToast("该歌曲已下架", "warning");
      return;
    }

    set({ currentSongIndex: index, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
    get().ensureSongSrc(index);
    const song = get().songs[index];
    if (song) {
      get().addToRecent(song.id);
      if (song.neteaseId) {
        get().fetchLyrics(song.neteaseId);
      }
    }
  },
  fetchSongsFromApi: async () => {
    set({ isLoadingSongs: true });
    const queries = SONG_QUERIES;

    // 并发请求，提高并发数加快加载
    const CONCURRENCY = 10;
    const newSongs: Song[] = [...initialSongs];
    // 保留当前收藏状态
    const currentSongs = get().songs;
    const favIds = new Set(currentSongs.filter((s) => s.isFavorite).map((s) => s.id));

    for (let i = 0; i < queries.length; i += CONCURRENCY) {
      const batch = queries.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (q, batchIdx) => {
          const idx = i + batchIdx;
          try {
            const results = await searchSongs(q.query, 1);
            if (results.length > 0) {
              const r = results[0];
              return {
                id: idx + 1,
                title: r.name || q.title,
                artist: r.artists || q.artist,
                cover: r.picUrl || "",
                src: "",
                duration: r.duration ? r.duration / 1000 : 0,
                neteaseId: r.id,
                isLoading: false,
                isFavorite: favIds.has(idx + 1) || currentSongs[idx]?.isFavorite || false,
                categoryId: q.categoryId,
              } as Song;
            }
          } catch {
            /* keep fallback initial song */
          }
          return initialSongs[idx];
        })
      );
      results.forEach((song, batchIdx) => {
        newSongs[i + batchIdx] = song;
      });
      // 每批次完成后立即更新 UI
      set({ songs: [...newSongs] });
    }

    set({ songs: newSongs, isLoadingSongs: false });
    get().ensureSongSrc(0);
  },
  ensureSongSrc: async (index: number) => {
    const { songs } = get();
    const song = songs[index];
    if (!song || song.src || song.isLoading) return;
    if (!song.neteaseId) return;

    // PRD 6.4：已下架歌曲不加载
    if (get().isSongTakenDown(song.id)) {
      get().showToast("该歌曲已下架", "warning");
      return;
    }

    // 精确更新单首歌曲
    set((state) => {
      const updated = [...state.songs];
      updated[index] = { ...updated[index], isLoading: true };
      return { songs: updated };
    });

    try {
      const url = await getSongUrl(song.neteaseId);
      if (url) {
        set((state) => {
          const updated = [...state.songs];
          // 只有当这首歌仍然是当前需要加载的歌时才更新 src
          if (updated[index]?.neteaseId === song.neteaseId) {
            updated[index] = { ...updated[index], src: url, isLoading: false };
          }
          return { songs: updated };
        });
      } else {
        // API 返回空 URL：可能是歌曲下架
        // PRD 6.4：标记歌曲已下架
        get().markSongTakenDown(song.id);
        set((state) => {
          const updated = [...state.songs];
          if (updated[index]?.neteaseId === song.neteaseId) {
            updated[index] = { ...updated[index], isLoading: false };
          }
          return { songs: updated };
        });
      }
    } catch {
      set((state) => {
        const updated = [...state.songs];
        if (updated[index]?.neteaseId === song.neteaseId) {
          updated[index] = { ...updated[index], isLoading: false };
        }
        return { songs: updated };
      });
    }

    // ensureSongSrc 统一负责获取歌词
    if (song.neteaseId) {
      get().fetchLyrics(song.neteaseId);
    }
  },
  fetchLyrics: async (neteaseId: number) => {
    try {
      const lrc = await getSongLyric(neteaseId);
      const parsed = parseLRC(lrc);
      set({ lyrics: parsed, currentLyricIndex: -1 });
    } catch {
      set({ lyrics: [], currentLyricIndex: -1 });
    }
  },
  updateCurrentLyricIndex: () => {
    const { lyrics, currentTime, currentLyricIndex } = get();
    if (lyrics.length === 0) return;

    let newIndex = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== currentLyricIndex) {
      set({ currentLyricIndex: newIndex });
    }
  },
  toggleShowLyrics: () => {
    set({ showLyrics: !get().showLyrics });
  },
  importLocalFiles: (files: FileList) => {
    const { songs } = get();
    const audioTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac", "audio/mp4", "audio/x-m4a"];
    const newSongs: Song[] = [...songs];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!audioTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i)) continue;

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split(/\s*[-–—]\s*/);
      const title = parts.length > 1 ? parts.slice(1).join(" - ").trim() : nameWithoutExt.trim();
      const artist = parts.length > 1 ? parts[0].trim() : "本地音乐";

      const objectUrl = URL.createObjectURL(file);

      newSongs.push({
        id: nextId++,
        title,
        artist,
        cover: "",
        src: objectUrl,
        duration: 0,
        isLoading: false,
        isFavorite: false,
      });
    }

    set({ songs: newSongs });
  },
  setSearchResults: (results: Song[]) => {
    set({ searchResults: results, isSearchMode: true });
  },
  clearSearch: () => {
    set({ searchResults: [], isSearchMode: false });
  },
  playSearchResult: (song: Song) => {
    const { songs } = get();
    const existIndex = songs.findIndex((s) => s.neteaseId === song.neteaseId && song.neteaseId);

    if (existIndex >= 0) {
      set({ currentSongIndex: existIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(existIndex);
      get().addToRecent(songs[existIndex].id);
    } else {
      const newSong: Song = { ...song, id: nextId++, src: "", isLoading: false, isFavorite: false };
      const newSongs = [...songs, newSong];
      const newIndex = newSongs.length - 1;
      set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(newIndex);
      get().addToRecent(newSong.id);
    }
    set({ isSearchMode: false, searchResults: [] });
  },
  togglePlayMode: () => {
    const { playMode } = get();
    const modes: PlayMode[] = ["sequential", "loop", "shuffle"];
    const currentIndex = modes.indexOf(playMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    set({ playMode: nextMode });
  },
  toggleFavorite: (index: number) => {
    set((state) => {
      const songs = [...state.songs];
      if (songs[index]) {
        songs[index] = { ...songs[index], isFavorite: !songs[index].isFavorite };
      }
      return { songs };
    });
  },
  toggleFavoriteById: (id: number) => {
    set((state) => {
      const idx = state.songs.findIndex((s) => s.id === id);
      if (idx >= 0) {
        const songs = [...state.songs];
        songs[idx] = { ...songs[idx], isFavorite: !songs[idx].isFavorite };
        return { songs };
      }
      // 歌曲尚未加入本地列表时，创建一个壳子再切换
      const stub: Song = {
        id,
        title: "",
        artist: "",
        cover: "",
        src: "",
        duration: 0,
        isLoading: false,
        isFavorite: true,
      };
      return { songs: [...state.songs, stub] };
    });
  },
  toggleShowFavorites: () => {
    set({ showFavorites: !get().showFavorites });
  },
  fetchHotSongs: async (forceRefresh?: boolean) => {
    set({ isLoadingHot: true });
    try {
      const results = await getHotSongs(20, !!forceRefresh);
      const hotSongs: Song[] = results.map((r, i) => ({
        id: 5000 + i,
        title: r.name,
        artist: r.artists,
        cover: r.picUrl || "",
        src: "",
        duration: r.duration ? r.duration / 1000 : 0,
        neteaseId: r.id,
        isLoading: false,
        isFavorite: false,
        heat: r.heat,
      }));
      set({ hotSongs, isLoadingHot: false });
    } catch {
      set({ isLoadingHot: false });
    }
  },
  toggleShowHotChart: () => {
    const show = !get().showHotChart;
    set({ showHotChart: show });
    if (show && get().hotSongs.length === 0) {
      get().fetchHotSongs();
    }
  },
  playHotSong: (song: Song) => {
    const { songs } = get();
    const existIndex = songs.findIndex((s) => s.neteaseId === song.neteaseId && song.neteaseId);
    if (existIndex >= 0) {
      set({ currentSongIndex: existIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(existIndex);
      get().addToRecent(songs[existIndex].id);
    } else {
      const newSong: Song = { ...song, id: nextId++, src: "", isLoading: false, isFavorite: false };
      const newSongs = [...songs, newSong];
      const newIndex = newSongs.length - 1;
      set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(newIndex);
      get().addToRecent(newSong.id);
    }
    set({ showHotChart: false });
  },
  setTheme: (theme) => set({ theme }),
  addToQueue: (song: Song) => {
    const { queues, activeQueueIndex } = get();
    const queue = queues[activeQueueIndex];
    if (queue.some((s) => s.id === song.id)) return;
    const newSong: Song = { ...song, src: "", isLoading: false, isFavorite: false };
    const newQueues = [...queues];
    newQueues[activeQueueIndex] = [...queue, newSong];
    set({ queue: newQueues[activeQueueIndex], queues: newQueues });
  },
  removeFromQueue: (id: number) => {
    const { queues, activeQueueIndex } = get();
    const newQueues = [...queues];
    newQueues[activeQueueIndex] = queues[activeQueueIndex].filter((s) => s.id !== id);
    set({ queue: newQueues[activeQueueIndex], queues: newQueues });
  },
  clearQueue: () => {
    const { queues, activeQueueIndex } = get();
    const newQueues = [...queues];
    newQueues[activeQueueIndex] = [];
    set({ queue: [], queues: newQueues });
  },
  playFromQueue: (id: number) => {
    const { queues, activeQueueIndex, songs } = get();
    const queue = queues[activeQueueIndex];
    const song = queue.find((s) => s.id === id);
    if (!song) return;
    const existIndex = songs.findIndex((s) => s.id === song.id);
    if (existIndex >= 0) {
      set({ currentSongIndex: existIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(existIndex);
      get().addToRecent(songs[existIndex].id);
    } else {
      const newSongs = [...songs, song];
      const newIndex = newSongs.length - 1;
      set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(newIndex);
      get().addToRecent(song.id);
    }
  },
  setActiveQueueIndex: (index: number) => {
    const { queues } = get();
    set({ activeQueueIndex: index, queue: queues[index] });
  },
  toggleShowQueue: () => set({ showQueue: !get().showQueue }),

  // 新增 actions
  setThemeMode: (mode) => set({ themeMode: mode }),
  setDayTheme: (theme) => set({ dayTheme: theme }),
  downloadSong: (songId: number) => {
    const { downloads } = get();
    if (downloads.includes(songId)) return;
    set({ downloads: [songId, ...downloads] });
  },
  isDownloaded: (songId: number) => get().downloads.includes(songId),
  removeDownload: (songId: number) => {
    set({ downloads: get().downloads.filter((id) => id !== songId) });
  },
  removeDownloads: (songIds: number[]) => {
    const removeSet = new Set(songIds);
    set({ downloads: get().downloads.filter((id) => !removeSet.has(id)) });
  },
  addToRecent: (songId: number) => {
    const { recentPlays } = get();
    const filtered = recentPlays.filter((id) => id !== songId);
    // PRD 3.5.3 最近播放保留 100 条
    set({ recentPlays: [songId, ...filtered].slice(0, 100) });
  },
  clearRecent: () => set({ recentPlays: [] }),
  createPlaylist: (params: { name: string; cover?: string; description?: string } | string) => {
    const name = typeof params === "string" ? params : params.name;
    const cover = typeof params === "string" ? undefined : params.cover;
    const description = typeof params === "string" ? undefined : params.description;
    const id = `pl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = Date.now();
    const newPlaylist: Playlist = {
      id,
      name,
      songIds: [],
      cover,
      description,
      createdAt: now,
      updatedAt: now,
      isCollected: false,
      source: "created",
      playCount: 0,
    };
    set({ playlists: [...get().playlists, newPlaylist] });
    // 同步调用远端：保留 mock 调用方便将来切换
    void createPlaylistRemote({
      name,
      cover,
      description,
    });
    return id;
  },
  addSongToPlaylist: (playlistId: string, songId: number) => {
    let result: { added: boolean; duplicated: boolean; full: boolean } = {
      added: false,
      duplicated: false,
      full: false,
    };
    set((state) => {
      const playlists = state.playlists.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.songIds.includes(songId)) {
          result = { added: false, duplicated: true, full: false };
          return p;
        }
        // C4 修订：单个歌单上限 1000 首
        if (p.songIds.length >= PLAYLIST_MAX_SONGS) {
          result = { added: false, duplicated: false, full: true };
          return p;
        }
        result = { added: true, duplicated: false, full: false };
        // 新加入的歌曲放到列表最前，方便"最新加入"优先展示
        return { ...p, songIds: [songId, ...p.songIds], updatedAt: Date.now() };
      });
      return { playlists };
    });
    // PRD 6.4：收藏数超限提示（在 set 回调外调用 get()）
    if (result.full) {
      setTimeout(() => get().showToast("收藏已达上限（单歌单上限 1000 首）", "warning"), 0);
    }
    return result;
  },
  addSongsToPlaylist: (playlistId: string, songIds: number[]) => {
    const res: AddSongsResponse = { added: [], duplicated: [] };
    set((state) => {
      const playlists = state.playlists.map((p) => {
        if (p.id !== playlistId) return p;
        const exist = new Set(p.songIds);
        const added: number[] = [];
        const duplicated: number[] = [];
        for (const id of songIds) {
          if (exist.has(id)) {
            duplicated.push(id);
            continue;
          }
          if (p.songIds.length + added.length >= PLAYLIST_MAX_SONGS) {
            // 超过上限的部分也算重复
            duplicated.push(id);
            continue;
          }
          added.push(id);
          exist.add(id);
        }
        res.added = added;
        res.duplicated = duplicated;
        if (added.length === 0) return p;
        return { ...p, songIds: [...added, ...p.songIds], updatedAt: Date.now() };
      });
      return { playlists };
    });
    return res;
  },
  removeSongFromPlaylist: (playlistId: string, songId: number) => {
    set({
      playlists: get().playlists.map((p) =>
        p.id === playlistId
          ? { ...p, songIds: p.songIds.filter((id) => id !== songId), updatedAt: Date.now() }
          : p
      ),
    });
  },
  removeSongsFromPlaylist: (playlistId: string, songIds: number[]) => {
    const removeSet = new Set(songIds);
    set({
      playlists: get().playlists.map((p) =>
        p.id === playlistId
          ? { ...p, songIds: p.songIds.filter((id) => !removeSet.has(id)), updatedAt: Date.now() }
          : p
      ),
    });
  },
  reorderPlaylistSongs: (playlistId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    set((state) => {
      const playlists = state.playlists.map((p) => {
        if (p.id !== playlistId) return p;
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= p.songIds.length ||
          toIndex >= p.songIds.length
        ) {
          return p;
        }
        const next = [...p.songIds];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return { ...p, songIds: next, updatedAt: Date.now() };
      });
      return { playlists };
    });
  },
  updatePlaylist: (playlistId: string, patch: { name?: string; cover?: string; description?: string }) => {
    set({
      playlists: get().playlists.map((p) =>
        p.id === playlistId ? { ...p, ...patch, updatedAt: Date.now() } : p
      ),
    });
    void updatePlaylistRemote(playlistId, patch);
  },
  deletePlaylist: (playlistId: string) => {
    set({
      playlists: get().playlists.filter((p) => p.id !== playlistId),
      collectedPlaylists: get().collectedPlaylists.filter((id) => id !== playlistId),
    });
    void deletePlaylistRemote(playlistId);
  },
  toggleCollectPlaylist: (playlistId: string) => {
    const { collectedPlaylists } = get();
    if (collectedPlaylists.includes(playlistId)) {
      set({ collectedPlaylists: collectedPlaylists.filter((id) => id !== playlistId) });
      void uncollectPlaylistRemote(playlistId);
    } else {
      set({ collectedPlaylists: [playlistId, ...collectedPlaylists] });
      void collectPlaylistRemote(playlistId);
    }
  },
  isCollectedPlaylist: (playlistId: string) => get().collectedPlaylists.includes(playlistId),
  getPlaylistById: (playlistId: string) => {
    const playlist = get().playlists.find((p) => p.id === playlistId);
    // PRD 6.4：歌单被删除 → 提示"歌单不存在"
    if (!playlist) {
      get().showToast("歌单不存在", "warning");
    }
    return playlist;
  },
  playSong: (song: Song) => {
    // PRD 6.4：歌曲下架检查
    if (song.isDelisted) {
      get().showToast("该歌曲已下架", "warning");
      return;
    }

    const { songs } = get();
    const existIndex = songs.findIndex((s) => s.id === song.id);
    if (existIndex >= 0) {
      set({ currentSongIndex: existIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(existIndex);
    } else {
      const newSong: Song = { ...song, id: nextId++, src: "", isLoading: false, isFavorite: false };
      const newSongs = [...songs, newSong];
      const newIndex = newSongs.length - 1;
      set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(newIndex);
    }
    get().addToRecent(song.id);
  },
  playSongById: (songId: number) => {
    const { songs } = get();
    const idx = songs.findIndex((s) => s.id === songId);
    if (idx >= 0) {
      set({ currentSongIndex: idx, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(idx);
      get().addToRecent(songId);
    }
  },

  // 模块 2 新增 actions
  setQuality: (q) => {
    const { quality, currentSongIndex } = get();
    if (q === quality) return;
    set({ quality: q });
    // 切换音质后重新加载当前歌曲
    if (currentSongIndex >= 0) {
      get().ensureSongSrc(currentSongIndex);
    }
  },
  pushPlayHistory: (index) => {
    const { playHistory } = get();
    const next = [...playHistory, index];
    // 最多保留 50 条历史，防止内存膨胀
    if (next.length > 50) next.shift();
    set({ playHistory: next });
  },
  popPlayHistory: () => {
    const { playHistory } = get();
    if (playHistory.length === 0) return undefined;
    const last = playHistory[playHistory.length - 1];
    set({ playHistory: playHistory.slice(0, -1) });
    return last;
  },
  showToast: (message, type = "info") => {
    set({ toast: { id: Date.now(), message, type } });
  },
  clearToast: () => set({ toast: null }),

  /* ============ PRD 6 异常处理 actions 实现 ============ */
  setIsOnline: (online) => {
    const prev = get().isOnline;
    set({ isOnline: online });
    // PRD 6.1：网络断开 → Toast 提示 + 播放暂停 + 保留进度
    if (!online && prev) {
      const { isPlaying, songs, currentSongIndex } = get();
      if (isPlaying) {
        // 保存当前进度用于断点续播
        const song = songs[currentSongIndex];
        if (song) {
          get().saveResumeProgress(song.id, get().currentTime);
        }
        set({ isPlaying: false });
      }
      get().showToast("网络连接失败", "error");
    }
    // PRD 6.1：网络恢复 → Toast 提示
    if (online && !prev) {
      get().showToast("网络已恢复", "success");
    }
  },
  retryAudioLoad: () => {
    const { audioRetryCount, songs, currentSongIndex } = get();
    const MAX_RETRY = 3; // PRD 6.2：自动重试3次
    if (audioRetryCount < MAX_RETRY) {
      set({ audioRetryCount: audioRetryCount + 1 });
      get().showToast(`音频加载失败，正在重试 (${audioRetryCount + 1}/${MAX_RETRY})`, "warning");
      // 清空 src 触发重新加载
      const song = songs[currentSongIndex];
      if (song) {
        set((state) => {
          const updated = [...state.songs];
          if (updated[currentSongIndex]) {
            updated[currentSongIndex] = { ...updated[currentSongIndex], src: "", isLoading: false };
          }
          return { songs: updated };
        });
        get().ensureSongSrc(currentSongIndex);
      }
    } else {
      // PRD 6.2：3次重试仍失败 → 跳过播放下一首
      get().showToast("音频加载失败，已跳过", "error");
      set({ audioRetryCount: 0 });
      get().playNext();
    }
  },
  resetAudioRetryCount: () => set({ audioRetryCount: 0 }),
  markSongTakenDown: (songId) => {
    const set_ = new Set(get().takenDownSongIds);
    set_.add(songId);
    // 同时标记歌曲的 isDelisted 字段
    set((state) => {
      const songs = [...state.songs];
      const idx = songs.findIndex((s) => s.id === songId);
      if (idx >= 0) {
        songs[idx] = { ...songs[idx], isDelisted: true };
      }
      return { songs, takenDownSongIds: set_ };
    });
  },
  isSongTakenDown: (songId) => get().takenDownSongIds.has(songId),
  saveResumeProgress: (songId, progress) => {
    set({ resumeProgress: { ...get().resumeProgress, [songId]: progress } });
  },
  getResumeProgress: (songId) => get().resumeProgress[songId] ?? 0,
  clearResumeProgress: (songId) => {
    const progress = { ...get().resumeProgress };
    delete progress[songId];
    set({ resumeProgress: progress });
  },

  /* ============ 模块 8 设置中心 actions 实现 - PRD 3.8 ============ */
  setCacheSize: (size) => set({ cacheSize: size }),
  setAutoPlay: (enabled) => set({ autoPlay: enabled }),
  setThemePreference: (pref) => {
    set({ themePreference: pref });
    // 立即同步基础主题模式与色系，让 TopNav/ThemeModeToggle 保持一致
    if (pref === "system") {
      const prefersDark = typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : false;
      set({ themeMode: prefersDark ? "night" : "day" });
    } else {
      set({ themeMode: pref === "dark" ? "night" : "day" });
    }
  },
  setLyricFontSize: (size) => set({ lyricFontSize: size }),
  setLyricTranslation: (enabled) => set({ lyricTranslation: enabled }),
  setPrivacy: (patch) =>
    set((state) => ({ privacy: { ...state.privacy, ...patch } })),
  clearLocalCache: () => {
    // PRD 3.8.1 缓存清理：清空本地歌曲缓存（下载列表、最近播放等）
    // 注意：仅清理音乐缓存，不动账号 token、用户偏好等
    set({ downloads: [], recentPlays: [], cacheUsed: 0 });
  },
  resetSettings: () => {
    set({
      cacheSize: SETTINGS_DEFAULTS.cacheSize,
      autoPlay: SETTINGS_DEFAULTS.autoPlay,
      themePreference: SETTINGS_DEFAULTS.theme,
      lyricFontSize: SETTINGS_DEFAULTS.lyricFontSize,
      lyricTranslation: SETTINGS_DEFAULTS.lyricTranslation,
      privacy: SETTINGS_DEFAULTS.privacy,
      volume: 80,
      playbackRate: 1,
      quality: "lossless",
    });
  },
  refreshCacheUsage: () => {
    // 估算 localStorage 占用 (KB → MB) 作为缓存显示的近似值
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const value = localStorage.getItem(key) || "";
        // UTF-16 每字符 2 字节
        total += (key.length + value.length) * 2;
      }
      const mb = total / 1024 / 1024;
      set({ cacheUsed: Math.max(0, Math.round(mb * 100) / 100) });
    } catch {
      set({ cacheUsed: 0 });
    }
  },

  /* ============ 模块 6 个性化推荐 actions 实现 - PRD 3.6 ============ */

  /** 收集推荐算法所需的全部关键词（来自播放历史/收藏/搜索/偏好） */
  _collectRecommendKeywords: () => {
    const { songs, recentPlays, searchHistory, preferences } = get();
    const favoriteKeywords: string[] = [];
    const historyKeywords: string[] = [];

    songs.forEach((s) => {
      if (s.isFavorite && s.title) favoriteKeywords.push(s.title, s.artist);
    });

    recentPlays.slice(0, 30).forEach((id) => {
      const s = songs.find((x) => x.id === id);
      if (s) {
        if (s.title) historyKeywords.push(s.title);
        if (s.artist) historyKeywords.push(s.artist);
      }
    });

    // 偏好标签的关键词已经在 PREFERENCE_KEYWORDS 里展开
    void preferences;

    return {
      historyKeywords: Array.from(new Set(historyKeywords)).slice(0, 10),
      favoriteKeywords: Array.from(new Set(favoriteKeywords)).slice(0, 10),
      searchKeywords: Array.from(new Set(searchHistory)).slice(0, 10),
      preferences,
    };
  },

  fetchDailyRecommend: async (forceRefresh = false) => {
    const today = new Date().toISOString().slice(0, 10);
    const { dailyRecommend, dailyRecommendDate, dailyRecommendStatus, _collectRecommendKeywords } = get();

    if (
      !forceRefresh &&
      dailyRecommendStatus === "ready" &&
      dailyRecommendDate === today &&
      dailyRecommend.length > 0
    ) {
      return; // 今日已加载
    }

    set({ dailyRecommendStatus: "loading" });

    try {
      const kw = _collectRecommendKeywords();
      const results = await getDailyRecommend({
        ...kw,
        limit: 30,
      });

      if (results.length === 0) {
        set({ dailyRecommendStatus: "error", dailyRecommendDate: today });
        return;
      }

      // 转换为本地 Song 格式，复用现有加载机制
      const newSongs: Song[] = results.map((r, i) => ({
        id: 10000 + i, // 隔离 id 段，避免与本地的冲突
        title: r.name,
        artist: r.artists,
        cover: r.picUrl || "",
        src: "",
        duration: r.duration ? r.duration / 1000 : 0,
        neteaseId: r.id,
        isLoading: false,
        isFavorite: false,
        album: r.album,
        heat: 0,
      }));

      set({
        dailyRecommend: newSongs,
        dailyRecommendStatus: "ready",
        dailyRecommendDate: today,
      });
    } catch {
      set({ dailyRecommendStatus: "error" });
    }
  },

  playDailyRecommendAt: (i: number) => {
    const { dailyRecommend, songs, playTrigger } = get();
    const song = dailyRecommend[i];
    if (!song) return;
    // 查找或加入本地 songs 列表
    const existIndex = songs.findIndex((s) => s.id === song.id);
    if (existIndex >= 0) {
      set({
        currentSongIndex: existIndex,
        isPlaying: true,
        currentTime: 0,
        lyrics: [],
        currentLyricIndex: -1,
        playTrigger: playTrigger + 1,
      });
      get().ensureSongSrc(existIndex);
    } else {
      const newSongs = [...songs, { ...song }];
      const newIndex = newSongs.length - 1;
      set({
        songs: newSongs,
        currentSongIndex: newIndex,
        isPlaying: true,
        currentTime: 0,
        lyrics: [],
        currentLyricIndex: -1,
        playTrigger: playTrigger + 1,
      });
      get().ensureSongSrc(newIndex);
    }
    get().addToRecent(song.id);
  },

  addDailyRecommendToQueue: () => {
    const { dailyRecommend, queues, activeQueueIndex } = get();
    if (dailyRecommend.length === 0) return;
    const newQueues = [...queues];
    const cur = newQueues[activeQueueIndex] || [];
    // 去重合并
    const existIds = new Set(cur.map((s) => s.id));
    const toAdd = dailyRecommend.filter((s) => !existIds.has(s.id));
    newQueues[activeQueueIndex] = [...cur, ...toAdd];
    set({ queue: newQueues[activeQueueIndex], queues: newQueues });
    get().showToast(`已添加 ${toAdd.length} 首到待播放`, "success");
  },

  startFm: async () => {
    set({ fmStatus: "loading", fmQueue: [], fmPlayed: [], fmCurrentIndex: -1 });
    try {
      const { _collectRecommendKeywords, songs } = get();
      const kw = _collectRecommendKeywords();
      const excludeIds = songs.map((s) => s.id);
      const fm = await getFmSong({ ...kw, excludeIds });
      if (!fm) {
        set({ fmStatus: "error" });
        return;
      }
      // 添加到本地 songs
      const newSong: Song = { ...fm, isLoading: false, isFavorite: false };
      const newSongs = [...songs, newSong];
      const newIndex = newSongs.length - 1;
      set({
        songs: newSongs,
        currentSongIndex: newIndex,
        isPlaying: true,
        currentTime: 0,
        lyrics: [],
        currentLyricIndex: -1,
        fmQueue: [fm],
        fmPlayed: [],
        fmCurrentIndex: 0,
        fmStatus: "ready",
        fmCurrentReason: fm.reason,
      });
      get().ensureSongSrc(newIndex);
      get().addToRecent(newSong.id);
      get().showToast(`私人 FM 启动：${fm.title}`, "info");
    } catch {
      set({ fmStatus: "error" });
    }
  },

  fmNext: async () => {
    const { fmQueue, fmPlayed, fmCurrentIndex, _collectRecommendKeywords, songs } = get();
    if (fmQueue.length === 0) {
      // 队列为空，重新启动
      await get().startFm();
      return;
    }
    // 将当前歌曲移到历史
    if (fmCurrentIndex >= 0 && fmCurrentIndex < fmQueue.length) {
      const cur = fmQueue[fmCurrentIndex];
      fmPlayed.push(cur);
    }
    // 索引前进
    const nextIndex = fmCurrentIndex + 1;
    if (nextIndex < fmQueue.length) {
      // 队列内还有
      const fm = fmQueue[nextIndex];
      const existIndex = songs.findIndex((s) => s.id === fm.id);
      if (existIndex >= 0) {
        set({
          currentSongIndex: existIndex,
          isPlaying: true,
          currentTime: 0,
          lyrics: [],
          currentLyricIndex: -1,
          fmCurrentIndex: nextIndex,
          fmCurrentReason: fm.reason,
        });
        get().ensureSongSrc(existIndex);
        get().addToRecent(fm.id);
      } else {
        const newSongs = [...songs, { ...fm }];
        const newIdx = newSongs.length - 1;
        set({
          songs: newSongs,
          currentSongIndex: newIdx,
          isPlaying: true,
          currentTime: 0,
          lyrics: [],
          currentLyricIndex: -1,
          fmCurrentIndex: nextIndex,
          fmCurrentReason: fm.reason,
        });
        get().ensureSongSrc(newIdx);
        get().addToRecent(fm.id);
      }
    } else {
      // 需要拉取下一首
      set({ fmStatus: "loading" });
      try {
        const kw = _collectRecommendKeywords();
        const excludeIds = [...songs.map((s) => s.id), ...fmQueue.map((s) => s.id), ...fmPlayed.map((s) => s.id)];
        const fm = await getFmSong({ ...kw, excludeIds });
        if (!fm) {
          set({ fmStatus: "error" });
          return;
        }
        const newSongs = [...songs, { ...fm }];
        const newIdx = newSongs.length - 1;
        set({
          songs: newSongs,
          currentSongIndex: newIdx,
          isPlaying: true,
          currentTime: 0,
          lyrics: [],
          currentLyricIndex: -1,
          fmQueue: [...fmQueue, fm],
          fmCurrentIndex: fmQueue.length,
          fmStatus: "ready",
          fmCurrentReason: fm.reason,
        });
        get().ensureSongSrc(newIdx);
        get().addToRecent(fm.id);
      } catch {
        set({ fmStatus: "error" });
      }
    }
  },

  fmRestart: async () => {
    await get().startFm();
  },

  fmDislikeCurrent: async () => {
    const { fmCurrentIndex, fmQueue, fmPlayed } = get();
    if (fmCurrentIndex < 0) return;
    const current = fmQueue[fmCurrentIndex];
    // 立即跳过：仅从历史里加一首，不动 fmQueue（因为它对应"接下来要播的"）
    if (current) {
      fmPlayed.push(current);
    }
    await get().fmNext();
  },

  fetchGuessYouLike: async (reset = false) => {
    if (reset) {
      set({ guessPlaylists: [], guessPage: 0, guessHasMore: true });
    }
    set({ guessStatus: "loading" });
    try {
      const { _collectRecommendKeywords, guessPage } = get();
      const kw = _collectRecommendKeywords();
      const page = reset ? 1 : guessPage + 1;
      const results = await getGuessYouLike({ ...kw, page, size: 12 });
      if (results.length === 0) {
        set({ guessStatus: "ready", guessHasMore: false });
        return;
      }
      set((s) => ({
        guessPlaylists: reset ? results : [...s.guessPlaylists, ...results],
        guessStatus: "ready",
        guessPage: page,
        guessHasMore: results.length >= 12,
      }));
    } catch {
      set({ guessStatus: "error" });
    }
  },

  loadMoreGuess: async () => {
    const { guessStatus, guessHasMore } = get();
    if (guessStatus === "loading" || !guessHasMore) return;
    await get().fetchGuessYouLike(false);
  },

  togglePreference: (tag) => {
    set((s) => {
      const has = s.preferences.includes(tag);
      const next = has ? s.preferences.filter((p) => p !== tag) : [...s.preferences, tag];
      return { preferences: next };
    });
  },

  recordSearch: (keyword) => {
    const kw = keyword.trim();
    if (!kw) return;
    set((s) => {
      const filtered = s.searchHistory.filter((x) => x !== kw);
      return { searchHistory: [kw, ...filtered].slice(0, 20) };
    });
  },

  setRecommendWeights: (w) => {
    set((s) => ({ recommendWeights: { ...s.recommendWeights, ...w } }));
  },
}));

// 订阅 store 变化，自动持久化（节流，避免 currentTime 等高频更新导致频繁写入）
let persistTimer: ReturnType<typeof setTimeout> | null = null;
usePlayerStore.subscribe((state) => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistState(state);
  }, 500);
});

export default usePlayerStore;
