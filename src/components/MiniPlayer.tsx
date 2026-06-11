import { useNavigate, useLocation } from "react-router-dom";
import { Play, Pause, SkipBack, SkipForward, Loader2, ListPlus, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import usePlayerStore from "../store/playerStore";
import { audioControls } from "../hooks/useAudioPlayer";

function formatTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function MiniPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const currentSong = usePlayerStore((s) => s.songs[s.currentSongIndex]);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const queue = usePlayerStore((s) => s.queue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const { togglePlay, seek } = audioControls;

  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [showQueuePopup, setShowQueuePopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ right: 0, bottom: 0 });
  // PRD 评审纪要 B3：切歌时一次性闪烁提示
  const [isFlashing, setIsFlashing] = useState(false);
  const playTrigger = usePlayerStore((s) => s.playTrigger);
  const prevTriggerRef = useRef(playTrigger);
  const progressRef = useRef<HTMLDivElement>(null);
  const queueBtnRef = useRef<HTMLButtonElement>(null);

  // B3：playTrigger 变化时触发一次性闪烁（2秒后停止）
  useEffect(() => {
    if (playTrigger > prevTriggerRef.current) {
      setIsFlashing(true);
      const t = setTimeout(() => setIsFlashing(false), 2000);
      prevTriggerRef.current = playTrigger;
      return () => clearTimeout(t);
    }
    prevTriggerRef.current = playTrigger;
  }, [playTrigger]);

  if (!currentSong || !currentSong.title) return null;
  if (location.pathname === "/play") return null;

  const displayTime = isDragging ? dragTime : currentTime;
  const ratio = duration > 0 ? Math.min(1, displayTime / duration) : 0;

  const getTimeFromPointer = (clientX: number) => {
    if (!progressRef.current || duration <= 0) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return r * duration;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragTime(getTimeFromPointer(e.clientX));
    progressRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragTime(getTimeFromPointer(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    seek(getTimeFromPointer(e.clientX));
  };

  return (
    <div
      className="fixed left-0 right-0 z-40 px-4"
      style={{ bottom: "16px" }}
      role="region"
      aria-label="播放控制栏"
    >
      {/* PRD 2.6 播放控制栏：高度64px，毛玻璃效果 */}
      <div
        className="max-w-3xl mx-auto rounded-card p-2 pl-3 pr-2 flex items-center gap-3 cursor-pointer glass-strong"
        style={{
          height: "64px",
          boxShadow: `0 8px 32px -4px color-mix(in srgb, var(--accent) 20%, transparent), 0 4px 16px rgba(0,0,0,0.15)`,
        }}
        onClick={() => navigate("/play")}
      >
        <div
          className={`w-10 h-10 rounded-cover overflow-hidden flex-shrink-0 ${isFlashing ? "ring-flash" : ""}`}
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
            <p className="font-outfit text-body font-semibold text-primary truncate">
              {currentSong.title}
            </p>
            <p className="font-dm text-caption text-soft truncate">
              {currentSong.artist}
            </p>
          </div>

          <div className="flex-1 hidden sm:flex items-center gap-2">
            <span className="font-dm text-mono text-faint">
              {formatTime(displayTime)}
            </span>
            <div
              ref={progressRef}
              className="flex-1 h-2 rounded-full cursor-pointer overflow-hidden"
              style={{ background: "var(--range-track)" }}
              role="slider"
              aria-label="播放进度"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={Math.floor(displayTime)}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${ratio * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                }}
              />
            </div>
            <span className="font-dm text-mono text-faint">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={playPrev}
            className="w-8 h-8 rounded-full flex items-center justify-center text-soft hover:text-primary transition-colors"
            aria-label="上一首"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 2px 12px -2px color-mix(in srgb, var(--accent) 40%, transparent)",
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-soft hover:text-primary transition-colors"
            aria-label="下一首"
          >
            <SkipForward size={16} />
          </button>
          <button
            ref={queueBtnRef}
            onClick={() => {
              if (!showQueuePopup && queueBtnRef.current) {
                const rect = queueBtnRef.current.getBoundingClientRect();
                setPopupPos({
                  right: window.innerWidth - rect.right,
                  bottom: window.innerHeight - rect.top + 8,
                });
              }
              setShowQueuePopup((v) => !v);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-soft hover:text-primary transition-colors"
            aria-label="待播放列表"
            title="待播放列表"
          >
            <ListPlus size={16} />
          </button>
        </div>
      </div>

      {/* 待播放列表弹窗 - 毛玻璃效果 */}
      {showQueuePopup && (
        <div
          className="fixed w-72 z-50 glass rounded-card p-3 shadow-card-hover animate-fade-in"
          style={{ right: popupPos.right, bottom: popupPos.bottom }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-outfit text-title-sm text-primary">待播放列表</span>
            <div className="flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-caption text-soft hover:text-red-500 transition-colors"
                >
                  清空
                </button>
              )}
              <button
                onClick={() => setShowQueuePopup(false)}
                className="song-row-action"
                style={{ width: "24px", height: "24px" }}
              >
                ×
              </button>
            </div>
          </div>
          {queue.length === 0 ? (
            <p className="text-caption text-soft py-3 text-center">待播放列表为空</p>
          ) : (
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {queue.map((qs, i) => (
                <div key={qs.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-btn-icon hover:bg-card-soft transition-colors">
                  <span className="w-5 text-center text-mono font-dm text-faint flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-outfit text-caption truncate">{qs.title}</p>
                    <p className="font-dm text-[10px] text-soft truncate">{qs.artist}</p>
                  </div>
                  <button
                    onClick={() => removeFromQueue(qs.id)}
                    className="opacity-0 group-hover:opacity-100 text-faint hover:text-red-500 transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
