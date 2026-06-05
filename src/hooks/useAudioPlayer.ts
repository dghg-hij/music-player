import { useEffect, useRef, useCallback } from "react";
import usePlayerStore from "../store/playerStore";

export interface AudioPlayerControls {
  togglePlay: () => void;
  seek: (time: number) => void;
  changeVolume: (volume: number) => void;
}

export default function useAudioPlayer(): AudioPlayerControls {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const songs = usePlayerStore((s) => s.songs);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const playNext = usePlayerStore((s) => s.playNext);
  const ensureSongSrc = usePlayerStore((s) => s.ensureSongSrc);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    const audio = audioRef.current;
    let rafId: number;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      playNext();
    };

    const tick = () => {
      setCurrentTime(audio.currentTime);
      rafId = requestAnimationFrame(tick);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    if (isPlaying) {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [setDuration, setCurrentTime, playNext, isPlaying]);

  // 预加载下一首歌曲的音源
  useEffect(() => {
    const nextIndex = currentSongIndex + 1;
    if (nextIndex < songs.length) {
      const nextSong = songs[nextIndex];
      if (nextSong && !nextSong.src && !nextSong.isLoading && nextSong.neteaseId) {
        ensureSongSrc(nextIndex);
      }
    }
  }, [currentSongIndex, songs, ensureSongSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const song = songs[currentSongIndex];
    if (!song || !song.src) return;

    audio.src = song.src;
    audio.volume = volume / 100;

    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentSongIndex, songs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
  }, [volume]);

  const togglePlay = useCallback(() => {
    setIsPlaying(!usePlayerStore.getState().isPlaying);
  }, [setIsPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
  }, []);

  const changeVolume = useCallback((vol: number) => {
    usePlayerStore.getState().setVolume(vol);
  }, []);

  return { togglePlay, seek, changeVolume };
}
