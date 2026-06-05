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
}

export interface Playlist {
  id: string;
  name: string;
  songIds: number[];
  createdAt: number;
}
