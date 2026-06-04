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
}

export type ThemeName = "purple" | "ocean" | "sunset" | "forest" | "rose" | "midnight";

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
