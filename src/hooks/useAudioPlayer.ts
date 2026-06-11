import { useEffect, useRef } from "react";
import usePlayerStore from "../store/playerStore";
import { reportPlay, reportPlayEnd } from "../services/musicApi";

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

// PRD 6.2：音频加载最大重试次数
const MAX_AUDIO_RETRIES = 3;

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

  // PRD 6.1：监听网络状态变化
  useEffect(() => {
    const handleOnline = () => usePlayerStore.getState().setIsOnline(true);
    const handleOffline = () => usePlayerStore.getState().setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 1. 事件监听（只绑一次）
  useEffect(() => {
    if (listenersAttached) return;
    listenersAttached = true;

    const audio = getAudio();

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      // PRD 6.2：断点续播 - 如果有保存的进度，从断点继续
      const state = usePlayerStore.getState();
      const song = state.songs[state.currentSongIndex];
      if (song) {
        const savedProgress = state.getResumeProgress(song.id);
        if (savedProgress > 0 && savedProgress < audio.duration - 1) {
          audio.currentTime = savedProgress;
          state.clearResumeProgress(song.id);
        }
      }
      // 加载成功时重置重试计数
      state.resetAudioRetryCount();
    };

    const handleEnded = () => {
      // PRD 3.2.7：歌曲播放结束 → 上报最终进度
      const state = usePlayerStore.getState();
      const song = state.songs[state.currentSongIndex];
      if (song) {
        reportPlayEnd(song.id, Date.now(), Math.floor(audio.duration || 0));
        // PRD 6.2：播放结束清除断点进度
        state.clearResumeProgress(song.id);
      }
      // 切歌前重置重试计数
      state.resetAudioRetryCount();
      playNext();
    };

    const handleError = () => {
      const state = usePlayerStore.getState();
      const song = state.songs[state.currentSongIndex];

      // 音频加载失败时，标记为未加载以便重试
      loadedSrcRef.current = "";

      // PRD 6.1：网络断开时不重试，直接暂停 + 保留进度
      if (!state.isOnline) {
        if (song) {
          state.saveResumeProgress(song.id, audio.currentTime);
        }
        state.setIsPlaying(false);
        state.showToast("网络连接失败，播放已暂停", "error");
        return;
      }

      // PRD 评审纪要 C2 修订：取消会员功能后，鉴权失败时直接走重试/降级流程
      // 音质降级已在 musicApi.getSongUrl 内部处理（hires → exhigh → standard）

      // PRD 6.2：音频加载失败 → 自动重试3次，仍失败则跳过播放下一首
      const retryCount = state.audioRetryCount;
      if (retryCount < MAX_AUDIO_RETRIES) {
        state.showToast(`音频加载失败，正在重试 (${retryCount + 1}/${MAX_AUDIO_RETRIES})...`, "info");
        // 使用 store 的 retryAudioLoad 统一管理重试计数
        setTimeout(() => {
          const currentState = usePlayerStore.getState();
          currentState.retryAudioLoad();
        }, 1500);
      } else {
        state.showToast("音频加载失败，已跳过该歌曲", "warning");
        state.resetAudioRetryCount();
        playNext();
      }
    };

    const handleCanPlay = () => {
      // 当音频就绪且应处于播放状态时，自动播放
      // 这确保切歌后即使 src 异步加载也能自动播放
      if (usePlayerStore.getState().isPlaying && audio.paused) {
        // PRD 6.1：网络断开时不自动播放
        if (!usePlayerStore.getState().isOnline) return;
        audio.play().catch(() => {
          setIsPlaying(false);
        });
      }
    };

    // PRD 6.2：音频播放中断 → 记录进度，尝试重新加载从断点继续
    const handleStalled = () => {
      const state = usePlayerStore.getState();
      const song = state.songs[state.currentSongIndex];
      if (song) {
        state.saveResumeProgress(song.id, audio.currentTime);
      }
      state.showToast("音频加载中断，正在尝试恢复...", "warning");
      // 尝试恢复：重新加载音频源
      if (audio.src && state.isOnline) {
        audio.load();
      }
    };

    // PRD 6.2：等待缓冲时记录进度
    const handleWaiting = () => {
      const state = usePlayerStore.getState();
      const song = state.songs[state.currentSongIndex];
      if (song) {
        state.saveResumeProgress(song.id, audio.currentTime);
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("stalled", handleStalled);
    audio.addEventListener("waiting", handleWaiting);
  }, [setDuration, playNext, setIsPlaying]);

  // 2. rAF 循环更新 currentTime + 30s 周期播放上报
  useEffect(() => {
    const audio = getAudio();
    const state = usePlayerStore.getState();
    const lastReportRef = { current: 0 };

    const tick = () => {
      const now = audio.currentTime;
      setCurrentTime(now);

      // PRD 3.2.7 + 5.4：播放启动时间上报 + 周期进度上报（节流 30s）
      if (now > 0 && now - lastReportRef.current >= 30) {
        lastReportRef.current = now;
        const song = usePlayerStore.getState().songs[usePlayerStore.getState().currentSongIndex];
        if (song) {
          reportPlay({
            songId: song.id,
            playTime: Date.now(),
            progress: Math.floor(now),
            device: "web",
          });
        }
      }

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
    void state;
  }, [isPlaying, setCurrentTime]);

  // 3. 核心逻辑：歌曲切换 + src 加载
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
      // PRD 6.2：切歌时重置重试计数
      usePlayerStore.getState().resetAudioRetryCount();
    }

    // 有新的 src 需要加载
    if (currentSongSrc && srcChanged) {
      loadedSrcRef.current = currentSongSrc;
      audio.src = currentSongSrc;
      // 从 store 读取最新值，避免闭包陈旧
      const state = usePlayerStore.getState();
      audio.volume = state.volume / 100;
      audio.playbackRate = state.playbackRate;

      // PRD 6.1：网络断开时不自动播放
      if (state.isPlaying && state.isOnline) {
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
      if (state.isPlaying && state.isOnline) {
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
      // PRD 6.1：网络断开时不允许播放
      if (!usePlayerStore.getState().isOnline) {
        usePlayerStore.getState().showToast("网络连接失败，无法播放", "error");
        setIsPlaying(false);
        return;
      }
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
        // PRD 6.4：已下架歌曲不加载
        if (state.isSongTakenDown(song.id)) {
          state.showToast("该歌曲已下架", "warning");
          return;
        }
        state.ensureSongSrc(currentSongIndex);
      }
    }
  }, [currentSongIndex, currentSongSrc, currentSongLoading]);

  return audioControls;
}
