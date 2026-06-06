import { useEffect, useRef, useCallback } from "react";
import usePlayerStore from "../store/playerStore";

export interface AudioPlayerControls {
  togglePlay: () => void;
  seek: (time: number) => void;
  changeVolume: (volume: number) => void;
}

// 全局单例 Audio 实例
let audioInstance: HTMLAudioElement | null = null;
let listenersAttached = false;
let globalPrevIsPlaying: boolean | null = null;

function getAudio(): HTMLAudioElement {
  if (!audioInstance) {
    audioInstance = new Audio();
    audioInstance.preload = "auto";
  }
  return audioInstance;
}

// 纯函数控制接口，不依赖 hook 实例，可在任何组件中安全调用
export const audioControls: AudioPlayerControls = {
  togglePlay: () => {
    usePlayerStore.getState().setIsPlaying(!usePlayerStore.getState().isPlaying);
  },
  seek: (time: number) => {
    getAudio().currentTime = time;
  },
  changeVolume: (vol: number) => {
    usePlayerStore.getState().setVolume(vol);
  },
};

export default function useAudioPlayer(): AudioPlayerControls {
  const rafIdRef = useRef<number>(0);

  // 订阅 store 状态
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const currentSongSrc = usePlayerStore((s) => s.songs[s.currentSongIndex]?.src || "");
  const currentSongLoading = usePlayerStore((s) => s.songs[s.currentSongIndex]?.isLoading || false);
  const playTrigger = usePlayerStore((s) => s.playTrigger);

  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const playNext = usePlayerStore((s) => s.playNext);

  // 追踪已加载的 src，避免重复加载
  const loadedSrcRef = useRef("");
  // 追踪当前应播放的 songIndex，用于判断是否需要重新加载
  const loadedIndexRef = useRef(currentSongIndex);
  // 追踪上一次 playTrigger，只在它真正变化时才重启播放
  const prevPlayTriggerRef = useRef(playTrigger);

  // 1. 事件监听（只绑一次）
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

    const handleError = () => {
      // 音频加载失败时，标记为未加载以便重试
      loadedSrcRef.current = "";
    };

    const handleCanPlay = () => {
      // 当音频就绪且应处于播放状态时，自动播放
      // 这确保切歌后即使 src 异步加载也能自动播放
      if (usePlayerStore.getState().isPlaying && audio.paused) {
        audio.play().catch(() => {
          setIsPlaying(false);
        });
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);
  }, [setDuration, playNext, setIsPlaying]);

  // 2. rAF 循环更新 currentTime
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

  // 3. 核心逻辑：歌曲切换 + src 加载
  //    只在歌曲索引、src 或 playTrigger 真正变化时触发
  useEffect(() => {
    const audio = getAudio();
    const indexChanged = loadedIndexRef.current !== currentSongIndex;
    const srcChanged = currentSongSrc !== loadedSrcRef.current;
    const triggerChanged = playTrigger !== prevPlayTriggerRef.current;
    prevPlayTriggerRef.current = playTrigger;

    // 歌曲索引变化 → 重置状态
    if (indexChanged) {
      audio.pause();
      audio.currentTime = 0;
      loadedSrcRef.current = "";
      loadedIndexRef.current = currentSongIndex;
    }

    // 有新的 src 需要加载
    if (currentSongSrc && srcChanged) {
      loadedSrcRef.current = currentSongSrc;
      audio.src = currentSongSrc;
      // 从 store 读取最新值，避免闭包陈旧
      const state = usePlayerStore.getState();
      audio.volume = state.volume / 100;
      audio.playbackRate = state.playbackRate;

      if (state.isPlaying) {
        audio.play().catch(() => {
          state.setIsPlaying(false);
        });
      }
      return;
    }

    // playTrigger 真正变化时才重启（单曲循环 / 上一首）
    if (!indexChanged && !srcChanged && triggerChanged && currentSongSrc) {
      audio.currentTime = 0;
      const state = usePlayerStore.getState();
      if (state.isPlaying) {
        audio.play().catch(() => {
          state.setIsPlaying(false);
        });
      }
    }

    // 歌曲切换了但 src 还没加载好（等待 ensureSongSrc 完成）
    // 不做任何操作，等 src 变化后上面的分支会处理
  }, [currentSongIndex, currentSongSrc, playTrigger]);

  // 4. 播放/暂停控制（仅在 isPlaying 变化且音频已加载时触发）
  useEffect(() => {
    // 使用全局变量追踪，确保多实例只执行一次
    if (globalPrevIsPlaying === isPlaying) return;
    globalPrevIsPlaying = isPlaying;

    const audio = getAudio();
    // 只有音频已加载时才控制播放/暂停
    if (!loadedSrcRef.current) return;

    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // 5. 音量控制
  useEffect(() => {
    getAudio().volume = volume / 100;
  }, [volume]);

  // 6. 倍速控制
  useEffect(() => {
    getAudio().playbackRate = playbackRate;
  }, [playbackRate]);

  // 7. 预加载下一首歌曲的音源
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

  // 8. 当前歌曲 src 为空且未在加载时，触发加载
  useEffect(() => {
    if (!currentSongSrc && !currentSongLoading) {
      const state = usePlayerStore.getState();
      const song = state.songs[currentSongIndex];
      if (song && !song.src && !song.isLoading && song.neteaseId) {
        state.ensureSongSrc(currentSongIndex);
      }
    }
  }, [currentSongIndex, currentSongSrc, currentSongLoading]);

  return audioControls;
}
