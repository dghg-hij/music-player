import { useRef, useCallback, useState } from "react";
import usePlayerStore from "../store/playerStore";
import { getThemeColors } from "./ThemePicker";

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function ProgressBar({
  currentTime,
  duration,
  onSeek,
}: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const theme = usePlayerStore((s) => s.theme);
  const { primary, secondary } = getThemeColors(theme);

  const progress = duration > 0 ? ((isDragging ? dragTime : currentTime) / duration) * 100 : 0;

  const getTimeFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current || duration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const time = getTimeFromEvent(e.clientX);
      setDragTime(time);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getTimeFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const time = getTimeFromEvent(e.clientX);
      setDragTime(time);
    },
    [isDragging, getTimeFromEvent]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const time = getTimeFromEvent(e.clientX);
      setIsDragging(false);
      onSeek(time);
    },
    [isDragging, getTimeFromEvent, onSeek]
  );

  return (
    <div className="w-full flex flex-col gap-2">
      <div
        ref={trackRef}
        className="relative w-full h-5 flex items-center cursor-pointer group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="absolute w-full h-1 rounded-full bg-white/10 group-hover:h-1.5 transition-all" />
        <div
          className="absolute h-1 rounded-full group-hover:h-1.5 transition-all"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(to right, ${primary}, ${secondary})`,
          }}
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg transition-transform group-hover:scale-125"
          style={{
            left: `calc(${progress}% - 7px)`,
            boxShadow: `0 0 10px ${primary}80, 0 0 20px ${primary}33`,
          }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="font-dm text-xs text-white/60">
          {formatTime(isDragging ? dragTime : currentTime)}
        </span>
        <span className="font-dm text-xs text-white/60">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
