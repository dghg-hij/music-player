import { useNavigate, useLocation } from "react-router-dom";
import { Play, Pause, SkipBack, SkipForward, Loader2 } from "lucide-react";
import usePlayerStore from "../store/playerStore";
import useAudioPlayer from "../hooks/useAudioPlayer";

function formatTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function MiniPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const currentSong = usePlayerStore((s) => s.songs[s.currentSongIndex]);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);

  const { togglePlay, seek } = useAudioPlayer();

  if (!currentSong || !currentSong.title) return null;
  if (location.pathname === "/play") return null;

  const ratio = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div
      className="fixed left-0 right-0 z-40 px-4"
      style={{ bottom: "16px" }}
    >
      <div
        className="max-w-3xl mx-auto rounded-full p-2 pl-3 pr-2 flex items-center gap-3 cursor-pointer clickable-pill"
        style={{
          background: "color-mix(in srgb, var(--card) 92%, transparent)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--border-strong)",
          boxShadow: `0 8px 24px -4px var(--accent)40, 0 4px 12px rgba(0,0,0,0.4)`,
        }}
        onClick={() => navigate("/play")}
      >
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-pulse"
          style={{ boxShadow: `0 0 0 2px var(--accent)` }}
        >
          {currentSong.cover ? (
            <img
              src={currentSong.cover}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
            >
              <span className="text-white/70 text-sm">♪</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="min-w-0 max-w-[140px]">
            <p className="font-outfit text-sm font-semibold text-primary truncate">
              {currentSong.title}
            </p>
            <p className="font-dm text-xs text-soft truncate">
              {currentSong.artist}
            </p>
          </div>

          <div className="flex-1 hidden sm:flex items-center gap-2">
            <span className="font-dm text-[10px] text-faint">
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-1 rounded-full cursor-pointer overflow-hidden"
              style={{ background: "var(--range-track)" }}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const r = (e.clientX - rect.left) / rect.width;
                seek(Math.max(0, Math.min(1, r)) * duration);
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${ratio * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                }}
              />
            </div>
            <span className="font-dm text-[10px] text-faint">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={playPrev}
            className="clickable-pill w-8 h-8 rounded-full flex items-center justify-center text-soft hover:text-primary"
            aria-label="上一首"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 0 14px -2px var(--accent)",
            }}
            aria-label={isPlaying ? "暂停" : "播放"}
          >
            {currentSong.isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={14} fill="white" />
            ) : (
              <Play size={14} fill="white" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={playNext}
            className="clickable-pill w-8 h-8 rounded-full flex items-center justify-center text-soft hover:text-primary"
            aria-label="下一首"
          >
            <SkipForward size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
