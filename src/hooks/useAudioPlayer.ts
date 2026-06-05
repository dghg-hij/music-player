import { useEffect, useRef, useCallback } from "react";
import usePlayerStore from "../store/playerStore";

export interface AudioPlayerControls {
  togglePlay: () => void;
  seek: (time: number) => void;
  changeVolume: (volume: number) => void;
}

// 全局单例 Audio 实例，确保整个应用只有一个
let audioInstance: HTMLAudioElement | null = null;
let listenersAttached = false;
// 记录当前正在播放的 src 字符串值（而非引用），避免因 songs 数组重建导致误判切歌
let lastPlayedSrc = "";

function getAudio(): HTMLAudioElement {
  if (!audioInstance) {
    audioInstance = new Audio();
    audioInstance.preload = "auto";
  }
  return audioInstance;
}

export default function useAudioPlayer(): AudioPlayerControls {
  const rafIdRef = useRef<number>(0);

  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const currentSongSrc = usePlayerStore((s) => s.songs[s.currentSongIndex]?.src || "");
  const currentSongLoading = usePlayerStore((s) => s.songs[s.currentSongIndex]?.isLoading || false);

  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const playNext = usePlayerStore((s) => s.playNext);

  // 只在首次挂载时绑定事件监听（全局单例只绑一次）
  useEffect(() => {
    if (listenersAttached) return;
    listenersAttached = true;

    const audio = getAudio();

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    // 注意：不在这里 cleanup，因为 Audio 是全局单例
    // 事件监听在整个应用生命周期内保持
  }, [setDuration, playNext]);

  // rAF 循环：只在 isPlaying 变化时启停
  useEffect(() => {
    const audio = getAudio();

    const tick = () => {
      setCurrentTime(audio.currentTime);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      rafIdRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafIdRef.current);
    }

    return () => {
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [isPlaying, setCurrentTime]);

  // 歌曲切换：只在 currentSongIndex 变化时处理
  const prevIndexRef = useRef(currentSongIndex);
  useEffect(() => {
    const audio = getAudio();
    const indexChanged = prevIndexRef.current !== currentSongIndex;
    prevIndexRef.current = currentSongIndex;

    if (indexChanged) {
      // 切歌时立即停止当前播放，防止重音
      audio.pause();
      audio.currentTime = 0;
      lastPlayedSrc = "";
    }

    // src 为空时不加载（等待异步加载完成）
    if (!currentSongSrc) return;

    // src 值和上次播放的一样，不需要重新加载
    if (currentSongSrc === lastPlayedSrc) return;

    // 加载新 src
    lastPlayedSrc = currentSongSrc;
    audio.src = currentSongSrc;
    audio.volume = volume / 100;
    audio.playbackRate = playbackRate;

    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentSongIndex, currentSongSrc, isPlaying, volume, playbackRate, setIsPlaying]);

  // 当 src 从空变为有值时（歌曲加载完成），自动开始播放
  const prevSrcRef = useRef(currentSongSrc);
  useEffect(() => {
    const audio = getAudio();
    // src 从空变为有值，且不是切歌场景（切歌由上面的 effect 处理）
    if (currentSongSrc && !prevSrcRef.current && currentSongSrc !== lastPlayedSrc) {
      lastPlayedSrc = currentSongSrc;
      audio.src = currentSongSrc;
      audio.volume = volume / 100;
      audio.playbackRate = playbackRate;
      if (isPlaying) {
        audio.play().catch(() => {
          setIsPlaying(false);
        });
      }
    }
    prevSrcRef.current = currentSongSrc;
  }, [currentSongSrc, isPlaying, volume, playbackRate, setIsPlaying]);

  // 播放/暂停控制（仅在 isPlaying 状态变化时触发，不与切歌逻辑冲突）
  useEffect(() => {
    const audio = getAudio();
    if (!audio.src || !lastPlayedSrc) return;

    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // 音量控制
  useEffect(() => {
    getAudio().volume = volume / 100;
  }, [volume]);

  // 倍速控制
  useEffect(() => {
    getAudio().playbackRate = playbackRate;
  }, [playbackRate]);

  // 预加载下一首歌曲的音源
  useEffect(() => {
    const state = usePlayerStore.getState();
    const nextIndex = currentSongIndex + 1;
    if (nextIndex < state.songs.length) {
      const nextSong = state.songs[nextIndex];
      if (nextSong && !nextSong.src && !nextSong.isLoading && nextSong.neteaseId) {
        state.ensureSongSrc(nextIndex);
      }
    }
  }, [currentSongIndex]);

  // 当前歌曲 src 为空且未在加载时，触发加载
  useEffect(() => {
    if (!currentSongSrc && !currentSongLoading) {
      const state = usePlayerStore.getState();
      const song = state.songs[currentSongIndex];
      if (song && !song.src && !song.isLoading && song.neteaseId) {
        state.ensureSongSrc(currentSongIndex);
      }
    }
  }, [currentSongIndex, currentSongSrc, currentSongLoading]);

  const togglePlay = useCallback(() => {
    setIsPlaying(!usePlayerStore.getState().isPlaying);
  }, [setIsPlaying]);

  const seek = useCallback((time: number) => {
    getAudio().currentTime = time;
  }, []);

  const changeVolume = useCallback((vol: number) => {
    usePlayerStore.getState().setVolume(vol);
  }, []);

  return { togglePlay, seek, changeVolume };
}
