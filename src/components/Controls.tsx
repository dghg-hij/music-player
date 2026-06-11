import { SkipBack, SkipForward, Play, Pause, Heart, Repeat, Repeat1, Shuffle } from "lucide-react";
import type { PlayMode } from "../types";
import usePlayerStore from "../store/playerStore";
import { getThemeColors } from "./ThemePicker";

interface ControlsProps {
  isPlaying: boolean;
  isFavorite: boolean;
  playMode: PlayMode;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleFavorite: () => void;
  onTogglePlayMode: () => void;
}

function PlayModeIcon({ mode }: { mode: PlayMode }) {
  if (mode === "loop") return <Repeat1 size={16} strokeWidth={2} />;
  if (mode === "shuffle") return <Shuffle size={16} strokeWidth={2} />;
  return <Repeat size={16} strokeWidth={2} />;
}

function PlayModeLabel({ mode }: { mode: PlayMode }) {
  if (mode === "loop") return "单曲循环";
  if (mode === "shuffle") return "随机循环";
  return "顺序循环";
}

export default function Controls({
  isPlaying,
  isFavorite,
  playMode,
  onPlayPause,
  onPrev,
  onNext,
  onToggleFavorite,
  onTogglePlayMode,
}: ControlsProps) {
  const theme = usePlayerStore((s) => s.theme);
  const { primary, secondary } = getThemeColors(theme);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-5">
        <button
          onClick={onTogglePlayMode}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
            playMode === "sequential"
              ? "text-soft hover:text-primary"
              : "hover:bg-card-soft"
          }`}
          style={playMode !== "sequential" ? { color: "var(--accent)" } : undefined}
          aria-label={PlayModeLabel({ mode: playMode })}
          title={PlayModeLabel({ mode: playMode })}
        >
          <PlayModeIcon mode={playMode} />
        </button>
        <button
          onClick={onPrev}
          className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-card-soft transition-all duration-200 active:scale-95"
          aria-label="上一首"
        >
          <SkipBack size={20} strokeWidth={2} />
        </button>
        <button
          onClick={onPlayPause}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-200 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            boxShadow: `0 4px 20px ${primary}44, 0 2px 10px ${secondary}22`,
          }}
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? (
            <Pause size={24} strokeWidth={2} fill="white" />
          ) : (
            <Play size={24} strokeWidth={2} fill="white" className="ml-1" />
          )}
        </button>
        <button
          onClick={onNext}
          className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-card-soft transition-all duration-200 active:scale-95"
          aria-label="下一首"
        >
          <SkipForward size={20} strokeWidth={2} />
        </button>
        <button
          onClick={onToggleFavorite}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
            isFavorite
              ? "text-red-500 hover:bg-red-500/10"
              : "text-soft hover:text-red-400"
          }`}
          aria-label={isFavorite ? "取消收藏" : "收藏"}
          title={isFavorite ? "取消收藏" : "收藏"}
        >
          <Heart
            size={16}
            strokeWidth={2}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>
      </div>
      <span className="font-dm text-mono text-faint">
        {PlayModeLabel({ mode: playMode })}
      </span>
    </div>
  );
}
