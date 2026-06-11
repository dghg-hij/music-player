import { Volume2, Volume1, VolumeX } from "lucide-react";
import { useRef, useCallback, useState } from "react";
import usePlayerStore from "../store/playerStore";
import { getThemeColors } from "./ThemePicker";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export default function VolumeControl({
  volume,
  onVolumeChange,
}: VolumeControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prevVolume, setPrevVolume] = useState(80);
  const theme = usePlayerStore((s) => s.theme);
  const { primary, secondary } = getThemeColors(theme);

  const VolumeIcon = volume === 0 ? VolumeX : volume <= 50 ? Volume1 : Volume2;

  const handleToggleMute = useCallback(() => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume);
    }
  }, [volume, prevVolume, onVolumeChange]);

  const getVolumeFromEvent = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * 100);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const vol = getVolumeFromEvent(e.clientX);
      onVolumeChange(vol);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getVolumeFromEvent, onVolumeChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const vol = getVolumeFromEvent(e.clientX);
      onVolumeChange(vol);
    },
    [isDragging, getVolumeFromEvent, onVolumeChange]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="flex items-center gap-3 w-full max-w-[200px]">
      <button
        onClick={handleToggleMute}
        className="text-soft hover:text-primary transition-colors flex-shrink-0"
        aria-label="切换静音"
      >
        <VolumeIcon size={18} strokeWidth={2} />
      </button>
      <div
        ref={trackRef}
        className="relative flex-1 h-4 flex items-center cursor-pointer group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="absolute w-full h-1 rounded-full" style={{ background: "var(--range-track)" }} />
        <div
          className="absolute h-1 rounded-full"
          style={{
            width: `${volume}%`,
            background: `linear-gradient(to right, ${primary}, ${secondary})`,
          }}
        />
        <div
          className="absolute w-3 h-3 rounded-full bg-white transition-transform group-hover:scale-125"
          style={{
            left: `calc(${volume}% - 6px)`,
            boxShadow: `0 0 8px ${primary}66`,
          }}
        />
      </div>
    </div>
  );
}
