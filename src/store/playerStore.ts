import { create } from "zustand";
import SONG_QUERIES from "../data/songs";
import { searchSongs, getSongUrl, getSongLyric, parseLRC, getHotSongs } from "../services/musicApi";
import type { Song, LyricLine, PlayMode, ThemeName } from "../types";

interface PlayerStore {
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
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

  setCurrentSongIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
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
}));

const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSongIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 80,
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

  setCurrentSongIndex: (index) => set({ currentSongIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => {
    set({ currentTime: time });
    get().updateCurrentLyricIndex();
  },
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),
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

    // 优先从待播放列表取下一首
    if (queue.length > 0) {
      const nextSong = queue[0];
      const newQueue = queue.slice(1);
      const existIndex = songs.findIndex((s) => s.id === nextSong.id);
      if (existIndex >= 0) {
        set({ currentSongIndex: existIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueue });
        get().ensureSongSrc(existIndex);
      } else {
        const newSongs = [...songs, nextSong];
        const newIndex = newSongs.length - 1;
        set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueue });
        get().ensureSongSrc(newIndex);
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
  },
  selectSong: (index) => {
    set({ currentSongIndex: index, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
    get().ensureSongSrc(index);
  },
  fetchSongsFromApi: async () => {
    set({ isLoadingSongs: true });
    const queries = SONG_QUERIES;

    const promises = queries.map(async (q, i) => {
      try {
        const results = await searchSongs(q.query, 1);
        if (results.length > 0) {
          const r = results[0];
          return {
            id: i + 1,
            title: r.name || q.title,
            artist: r.artists || q.artist,
            cover: r.picUrl || "",
            src: "",
            duration: r.duration ? r.duration / 1000 : 0,
            neteaseId: r.id,
            isLoading: false,
            isFavorite: false,
          } as Song;
        }
      } catch {}
      return initialSongs[i];
    });

    const newSongs = await Promise.all(promises);
    set({ songs: newSongs, isLoadingSongs: false });
    get().ensureSongSrc(0);
  },
  ensureSongSrc: async (index: number) => {
    const { songs } = get();
    const song = songs[index];
    if (!song || song.src || song.isLoading) return;
    if (!song.neteaseId) return;

    const updatedSongs = [...songs];
    updatedSongs[index] = { ...updatedSongs[index], isLoading: true };
    set({ songs: updatedSongs });

    try {
      const url = await getSongUrl(song.neteaseId);
      if (url) {
        const finalSongs = [...get().songs];
        finalSongs[index] = { ...finalSongs[index], src: url, isLoading: false };
        set({ songs: finalSongs });
      } else {
        const finalSongs = [...get().songs];
        finalSongs[index] = { ...finalSongs[index], isLoading: false };
        set({ songs: finalSongs });
      }
    } catch {
      const finalSongs = [...get().songs];
      finalSongs[index] = { ...finalSongs[index], isLoading: false };
      set({ songs: finalSongs });
    }

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
    } else {
      const newSong: Song = { ...song, id: nextId++, src: "", isLoading: false, isFavorite: false };
      const newSongs = [...songs, newSong];
      const newIndex = newSongs.length - 1;
      set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(newIndex);
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
    const songs = [...get().songs];
    if (songs[index]) {
      songs[index] = { ...songs[index], isFavorite: !songs[index].isFavorite };
      set({ songs });
    }
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
    } else {
      const newSong: Song = { ...song, id: nextId++, src: "", isLoading: false, isFavorite: false };
      const newSongs = [...songs, newSong];
      const newIndex = newSongs.length - 1;
      set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1 });
      get().ensureSongSrc(newIndex);
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
    } else {
      const newSongs = [...songs, song];
      const newIndex = newSongs.length - 1;
      set({ songs: newSongs, currentSongIndex: newIndex, isPlaying: true, currentTime: 0, lyrics: [], currentLyricIndex: -1, queue: newQueue });
      get().ensureSongSrc(newIndex);
    }
  },
  toggleShowQueue: () => set({ showQueue: !get().showQueue }),
}));

export default usePlayerStore;
