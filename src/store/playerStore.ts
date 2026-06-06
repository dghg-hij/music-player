import { create } from "zustand";
import SONG_QUERIES from "../data/songs";
import { searchSongs, getSongUrl, getSongLyric, parseLRC, getHotSongs } from "../services/musicApi";
import type { Song, LyricLine, PlayMode, ThemeName, ThemeMode, DayThemeName, Playlist } from "../types";

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
  showQueue: boolean;

  // 新增状态
  themeMode: ThemeMode;
  dayTheme: DayThemeName;
  downloads: number[];
  recentPlays: number[];
  playlists: Playlist[];

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
  fetchHotSongs: () => Promise<void>;
  toggleShowHotChart: () => void;
  playHotSong: (song: Song) => void;
  setTheme: (theme: ThemeName) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (id: number) => void;
  clearQueue: () => void;
  playFromQueue: (id: number) => void;
  toggleShowQueue: () => void;

  // 新增 actions
  setThemeMode: (mode: ThemeMode) => void;
  setDayTheme: (theme: DayThemeName) => void;
  downloadSong: (songId: number) => void;
  isDownloaded: (songId: number) => boolean;
  removeDownload: (songId: number) => void;
  addToRecent: (songId: number) => void;
  clearRecent: () => void;
  createPlaylist: (name: string) => string;
  addSongToPlaylist: (playlistId: string, songId: number) => void;
  removeSongFromPlaylist: (playlistId: string, songId: number) => void;
  deletePlaylist: (playlistId: string) => void;
  playSong: (song: Song) => void;
  playSongById: (songId: number) => void;
}

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

const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSongIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 80,
  playbackRate: 1,
  songs: initialSongs,
  isLoadingSongs: false,
  lyrics: [],
  currentLyricIndex: -1,
  showLyrics: false,
  searchResults: [],
  isSearchMode: false,
  playMode: "sequential",
  showFavorites: false,
  hotSongs: [],
  isLoadingHot: false,
  showHotChart: false,
  theme: "purple",
  queue: [],
  showQueue: false,

  // 新增状态初始值
  themeMode: "night",
  dayTheme: "mint",
  downloads: [],
  recentPlays: [],
  playlists: [],

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
    const { songs, currentSongIndex, playMode, queue } = get();

    if (queue.length > 0) {
      const nextSong = queue[0];
      const newQueue = queue.slice(1);
      const existIndex = songs.findIndex((s) => s.id === nextSong.id);
      if (existIndex >= 0) {
        set({ currentSongIndex: existIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueue });
        get().ensureSongSrc(existIndex);
        get().addToRecent(songs[existIndex].id);
      } else {
        const newSongs = [...songs, nextSong];
        const newIndex = newSongs.length - 1;
        set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueue });
        get().ensureSongSrc(newIndex);
        get().addToRecent(nextSong.id);
      }
      return;
    }

    let nextIndex: number;
    if (playMode === "loop") {
      nextIndex = currentSongIndex;
    } else if (playMode === "shuffle") {
      if (songs.length <= 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * songs.length);
        } while (nextIndex === currentSongIndex);
      }
    } else {
      nextIndex = (currentSongIndex + 1) % songs.length;
    }

    set({ currentSongIndex: nextIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
    get().ensureSongSrc(nextIndex);
    const nextSong = get().songs[nextIndex];
    if (nextSong) get().addToRecent(nextSong.id);
  },
  playPrev: () => {
    const { songs, currentSongIndex, playMode } = get();

    let prevIndex: number;
    if (playMode === "shuffle") {
      if (songs.length <= 1) {
        prevIndex = 0;
      } else {
        do {
          prevIndex = Math.floor(Math.random() * songs.length);
        } while (prevIndex === currentSongIndex);
      }
    } else {
      prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    }

    set({ currentSongIndex: prevIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
    get().ensureSongSrc(prevIndex);
    const prevSong = get().songs[prevIndex];
    if (prevSong) get().addToRecent(prevSong.id);
  },
  selectSong: (index) => {
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
                isFavorite: false,
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
        // API 返回空 URL，标记加载完成但 src 为空，允许重试
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
  fetchHotSongs: async () => {
    set({ isLoadingHot: true });
    try {
      const results = await getHotSongs(20);
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
    const { queue } = get();
    if (queue.some((s) => s.id === song.id)) return;
    const newSong: Song = { ...song, id: nextId++, src: "", isLoading: false, isFavorite: false };
    set({ queue: [...queue, newSong] });
  },
  removeFromQueue: (id: number) => {
    set({ queue: get().queue.filter((s) => s.id !== id) });
  },
  clearQueue: () => set({ queue: [] }),
  playFromQueue: (id: number) => {
    const { queue, songs } = get();
    const song = queue.find((s) => s.id === id);
    if (!song) return;
    const newQueue = queue.filter((s) => s.id !== id);
    const existIndex = songs.findIndex((s) => s.id === song.id);
    if (existIndex >= 0) {
      set({ currentSongIndex: existIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueue });
      get().ensureSongSrc(existIndex);
      get().addToRecent(songs[existIndex].id);
    } else {
      const newSongs = [...songs, song];
      const newIndex = newSongs.length - 1;
      set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueue });
      get().ensureSongSrc(newIndex);
      get().addToRecent(song.id);
    }
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
  addToRecent: (songId: number) => {
    const { recentPlays } = get();
    const filtered = recentPlays.filter((id) => id !== songId);
    set({ recentPlays: [songId, ...filtered].slice(0, 50) });
  },
  clearRecent: () => set({ recentPlays: [] }),
  createPlaylist: (name: string) => {
    const id = `pl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPlaylist: Playlist = {
      id,
      name,
      songIds: [],
      createdAt: Date.now(),
    };
    set({ playlists: [...get().playlists, newPlaylist] });
    return id;
  },
  addSongToPlaylist: (playlistId: string, songId: number) => {
    const { playlists } = get();
    set({
      playlists: playlists.map((p) => {
        if (p.id === playlistId) {
          if (p.songIds.includes(songId)) return p;
          return { ...p, songIds: [songId, ...p.songIds] };
        }
        return p;
      }),
    });
  },
  removeSongFromPlaylist: (playlistId: string, songId: number) => {
    set({
      playlists: get().playlists.map((p) =>
        p.id === playlistId ? { ...p, songIds: p.songIds.filter((id) => id !== songId) } : p
      ),
    });
  },
  deletePlaylist: (playlistId: string) => {
    set({ playlists: get().playlists.filter((p) => p.id !== playlistId) });
  },
  playSong: (song: Song) => {
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
}));

function songsListItem(songs: Song[], index: number) {
  return songs && songs[index] !== undefined;
}

export default usePlayerStore;
