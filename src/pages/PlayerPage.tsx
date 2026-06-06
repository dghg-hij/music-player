import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Heart,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Mic2,
  Loader2,
  Download,
  Star,
  ListPlus,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import usePlayerStore from "../store/playerStore";
import { audioControls } from "../hooks/useAudioPlayer";
import Lyrics from "../components/Lyrics";
import type { PlayMode } from "../types";

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function PlayModeIcon({ mode }: { mode: PlayMode }) {
  if (mode === "loop") return <Repeat1 size={18} strokeWidth={2} />;
  if (mode === "shuffle") return <Shuffle size={18} strokeWidth={2} />;
  return <Repeat size={18} strokeWidth={2} />;
}

function PlayModeLabel({ mode }: { mode: PlayMode }) {
  if (mode === "loop") return "单曲循环";
  if (mode === "shuffle") return "随机循环";
  return "顺序循环";
}

export default function PlayerPage() {
  const navigate = useNavigate();
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const lyrics = usePlayerStore((s) => s.lyrics);
  const currentLyricIndex = usePlayerStore((s) => s.currentLyricIndex);
  const playMode = usePlayerStore((s) => s.playMode);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const downloads = usePlayerStore((s) => s.downloads);
  const playlists = usePlayerStore((s) => s.playlists);
  const currentSong = usePlayerStore((s) => s.songs[s.currentSongIndex]);
  const songs = usePlayerStore((s) => s.songs);
  const queue = usePlayerStore((s) => s.queue);
  const queues = usePlayerStore((s) => s.queues);
  const activeQueueIndex = usePlayerStore((s) => s.activeQueueIndex);
  const setActiveQueueIndex = usePlayerStore((s) => s.setActiveQueueIndex);
  const playFromQueue = usePlayerStore((s) => s.playFromQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const togglePlayMode = usePlayerStore((s) => s.togglePlayMode);
  const toggleFavoriteById = usePlayerStore((s) => s.toggleFavoriteById);
  const downloadSong = usePlayerStore((s) => s.downloadSong);
  const removeDownload = usePlayerStore((s) => s.removeDownload);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const addSongToPlaylist = usePlayerStore((s) => s.addSongToPlaylist);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);

  const { togglePlay, seek, changeVolume } = audioControls;

  const [showLyrics, setShowLyrics] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showQueuePopup, setShowQueuePopup] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [toast, setToast] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const validSongsCount = songs.filter((s) => s.title).length;

  const getTimeFromPointer = useCallback((clientX: number) => {
    if (!progressRef.current || duration <= 0) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  const handleProgressPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const time = getTimeFromPointer(e.clientX);
    setDragTime(time);
    progressRef.current?.setPointerCapture(e.pointerId);
  }, [getTimeFromPointer]);

  const handleProgressPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const time = getTimeFromPointer(e.clientX);
    setDragTime(time);
  }, [isDragging, getTimeFromPointer]);

  const handleProgressPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const time = getTimeFromPointer(e.clientX);
    setIsDragging(false);
    seek(time);
  }, [isDragging, getTimeFromPointer, seek]);

  const displayTime = isDragging ? dragTime : currentTime;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!currentSong || !currentSong.title) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="font-dm text-soft">还没有选歌，去首页挑一首吧</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded-full text-sm font-dm text-white transition-transform active:scale-95"
          style={{ background: "var(--accent)" }}
        >
          返回首页
        </button>
      </div>
    );
  }

  const isFavorite = !!currentSong.isFavorite;
  const isDownloaded = downloads.includes(currentSong.id);

  return (
    <div className="min-h-[calc(100vh-9rem)] flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> 返回
        </button>
        <div className="font-dm text-xs text-soft">
          正在播放 · {currentSongIndex + 1}/{validSongsCount}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowQueuePopup((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors"
          >
            <ListPlus size={14} />
            待播放{queue.length > 0 && <span className="ml-0.5 text-[10px]" style={{ color: "var(--accent)" }}>({queue.length})</span>}
          </button>
          {showQueuePopup && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowQueuePopup(false)} />
              <div
                className="absolute right-0 top-full mt-2 w-72 z-20 card-surface p-3 shadow-2xl animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-outfit text-sm font-semibold text-primary">待播放列表</span>
                  <div className="flex items-center gap-2">
                    {queue.length > 0 && (
                      <button
                        onClick={() => { clearQueue(); }}
                        className="text-xs text-soft hover:text-red-500 transition-colors"
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
                {/* 列表1/2/3切换标签 */}
                <div className="flex gap-1 mb-2">
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveQueueIndex(idx)}
                      className={`flex-1 px-2 py-1 rounded-md text-xs font-dm transition-all ${
                        idx === activeQueueIndex
                          ? "text-white"
                          : "text-soft hover:text-primary"
                      }`}
                      style={
                        idx === activeQueueIndex
                          ? { background: "var(--accent)" }
                          : { background: "var(--card-soft, rgba(255,255,255,0.06))" }
                      }
                    >
                      列表{idx + 1}{queues[idx].length > 0 && <span className="ml-0.5">({queues[idx].length})</span>}
                    </button>
                  ))}
                </div>
                {queue.length === 0 ? (
                  <p className="text-xs text-soft py-3 text-center">待播放列表为空</p>
                ) : (
                  <div className="space-y-0.5 max-h-64 overflow-y-auto">
                    {queue.map((qs, i) => (
                      <div key={qs.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-card-soft transition-colors cursor-pointer"
                        onClick={() => { playFromQueue(qs.id); setShowQueuePopup(false); }}
                      >
                        <span className="w-5 text-center text-xs font-dm text-faint flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-outfit text-xs truncate">{qs.title}</p>
                          <p className="font-dm text-[10px] text-soft truncate">{qs.artist}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromQueue(qs.id); }}
                          className="opacity-0 group-hover:opacity-100 text-faint hover:text-red-500 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 主体区域：播放器 */}
      <div className="flex-1">
        {/* 左侧：播放器主区域 */}
        <div
          className="relative rounded-3xl p-5 md:p-6 lg:p-8 flex flex-col"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          {/* 背景渐变装饰 */}
          <div
            className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--accent), transparent 60%)",
            }}
          />

          <div className="relative flex-1 flex flex-col items-center justify-center gap-5 md:gap-6 min-h-[320px] md:min-h-[400px]">
            {/* 封面图 */}
            <div
              className="relative w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-3xl overflow-hidden flex-shrink-0"
              style={{
                boxShadow: `0 0 60px -4px var(--accent), 0 0 120px -8px var(--accent-2)`,
              }}
            >
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  padding: "3px",
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />
              {currentSong.cover ? (
                <img
                  src={currentSong.cover}
                  alt={currentSong.title}
                  className="w-full h-full object-cover rounded-3xl"
                />
              ) : (
                <div
                  className="w-full h-full rounded-3xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  }}
                >
                  <span className="text-6xl opacity-50 text-white">♪</span>
                </div>
              )}
            </div>

            {/* 歌曲信息 */}
            <div className="text-center max-w-md">
              <h1 className="font-outfit font-bold text-2xl md:text-3xl text-primary leading-tight truncate">
                {currentSong.title}
              </h1>
              <p className="font-dm text-sm text-soft mt-1.5 truncate">
                {currentSong.artist}
              </p>
              {currentSong.isLoading && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--accent)" }} />
                  <span className="font-dm text-xs text-faint">正在获取播放链接...</span>
                </div>
              )}
            </div>

            {/* 进度条 */}
            <div className="w-full max-w-md space-y-1.5">
              <div
                ref={progressRef}
                className="h-2 rounded-full cursor-pointer group/progress"
                style={{ background: "var(--range-track)" }}
                onPointerDown={handleProgressPointerDown}
                onPointerMove={handleProgressPointerMove}
                onPointerUp={handleProgressPointerUp}
              >
                <div
                  className="h-full rounded-full relative"
                  style={{
                    width: `${duration > 0 ? (displayTime / duration) * 100 : 0}%`,
                    background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                  }}
                >
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                    style={{ boxShadow: "0 0 8px var(--accent)" }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-dm text-soft">
                <span>{formatTime(displayTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* 播放控制按钮 */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayMode}
                className="w-10 h-10 rounded-full flex items-center justify-center text-soft hover:text-primary transition-colors"
                title={PlayModeLabel({ mode: playMode })}
              >
                <PlayModeIcon mode={playMode} />
              </button>
              <button
                onClick={playPrev}
                className="w-12 h-12 rounded-full flex items-center justify-center text-primary hover:bg-card-soft transition-colors"
                aria-label="上一首"
              >
                <SkipBack size={22} strokeWidth={2} />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform active:scale-95"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  boxShadow: "0 0 30px -4px var(--accent)",
                }}
                aria-label={isPlaying ? "暂停" : "播放"}
              >
                {isPlaying ? (
                  <Pause size={28} strokeWidth={2} fill="white" />
                ) : (
                  <Play size={28} strokeWidth={2} fill="white" className="ml-1" />
                )}
              </button>
              <button
                onClick={playNext}
                className="w-12 h-12 rounded-full flex items-center justify-center text-primary hover:bg-card-soft transition-colors"
                aria-label="下一首"
              >
                <SkipForward size={22} strokeWidth={2} />
              </button>
              {/* 歌词按钮：点击打开全屏歌词页面 */}
              <button
                onClick={() => setShowLyrics(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-soft hover:text-primary transition-colors"
                aria-label="歌词"
                title="歌词"
              >
                <Mic2 size={18} />
              </button>
            </div>

            {/* 操作按钮行 */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  if (isDownloaded) {
                    removeDownload(currentSong.id);
                    setToast("已从下载中移除");
                  } else {
                    downloadSong(currentSong.id);
                    setToast("已加入下载");
                  }
                }}
                className={`song-row-action ${isDownloaded ? "is-active" : ""}`}
                title={isDownloaded ? "已下载" : "下载"}
              >
                {isDownloaded ? <Check size={14} /> : <Download size={14} />}
              </button>
              <button
                onClick={() => {
                  toggleFavoriteById(currentSong.id);
                  setToast(isFavorite ? "已取消喜欢" : "已加入我喜欢的");
                }}
                className={`song-row-action ${isFavorite ? "is-favorite" : ""}`}
                title={isFavorite ? "已喜欢" : "喜欢"}
              >
                <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
              </button>
              <button
                onClick={() => setShowPlaylistPicker((v) => !v)}
                className="song-row-action"
                title="加入歌单"
              >
                <Star size={14} />
              </button>
              <button
                onClick={() => {
                  addToQueue(currentSong);
                  setToast("已加入待播放");
                }}
                className="song-row-action"
                title="加入播放列表"
              >
                <ListPlus size={14} />
              </button>

            </div>

            {/* 歌单选择弹窗 */}
            {showPlaylistPicker && (
              <div
                className="absolute bottom-2 right-2 w-72 z-20 card-surface p-3 shadow-2xl animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-outfit text-sm font-semibold text-primary">加入歌单</span>
                  <button
                    onClick={() => setShowPlaylistPicker(false)}
                    className="song-row-action"
                    style={{ width: "24px", height: "24px" }}
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {playlists.length === 0 && !showCreateInput && (
                    <p className="text-xs text-soft py-3 text-center">还没有歌单</p>
                  )}
                  {playlists.map((pl) => {
                    const contains = pl.songIds.includes(currentSong.id);
                    return (
                      <button
                        key={pl.id}
                        disabled={contains}
                        onClick={() => {
                          addSongToPlaylist(pl.id, currentSong.id);
                          setShowPlaylistPicker(false);
                          setToast(`已加入「${pl.name}」`);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors ${
                          contains
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-card-soft text-primary"
                        }`}
                      >
                        <span
                          className="w-7 h-7 rounded-md flex items-center justify-center text-xs text-white"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
                        >
                          ♪
                        </span>
                        <span className="flex-1 truncate font-dm">{pl.name}</span>
                        {contains && <Check size={12} style={{ color: "var(--accent)" }} />}
                      </button>
                    );
                  })}
                </div>
                {showCreateInput ? (
                  <div className="mt-2 flex gap-1">
                    <input
                      autoFocus
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const name = newPlaylistName.trim();
                          if (name) {
                            const id = createPlaylist(name);
                            addSongToPlaylist(id, currentSong.id);
                            setNewPlaylistName("");
                            setShowCreateInput(false);
                            setShowPlaylistPicker(false);
                            setToast(`已创建「${name}」`);
                          }
                        }
                        if (e.key === "Escape") setShowCreateInput(false);
                      }}
                      placeholder="新歌单名称"
                      className="flex-1 bg-card-soft text-primary text-sm rounded-lg px-2 py-1.5 outline-none border border-default focus:border-accent"
                    />
                    <button
                      onClick={() => {
                        const name = newPlaylistName.trim();
                        if (name) {
                          const id = createPlaylist(name);
                          addSongToPlaylist(id, currentSong.id);
                          setNewPlaylistName("");
                          setShowCreateInput(false);
                          setShowPlaylistPicker(false);
                          setToast(`已创建「${name}」`);
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg text-xs font-dm text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      创建
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateInput(true)}
                    className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-dm text-soft hover:text-primary hover:bg-card-soft"
                  >
                    <Star size={12} /> 新建歌单
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 底部：音量 + 倍速控制 */}
          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-default">
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              {volume === 0 ? (
                <VolumeX size={16} className="text-soft flex-shrink-0" />
              ) : (
                <Volume2 size={16} className="text-soft flex-shrink-0" />
              )}
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => changeVolume(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="font-dm text-xs text-soft w-8 text-right">{volume}</span>
            </div>
            <div className="flex items-center gap-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`px-2 py-1 rounded-md text-xs font-dm transition-all ${
                    playbackRate === rate
                      ? "text-white"
                      : "text-soft hover:text-primary"
                  }`}
                  style={
                    playbackRate === rate
                      ? { background: "var(--accent)" }
                      : { background: "transparent" }
                  }
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 全屏歌词页面 */}
      {showLyrics && (
        <div
          className="fixed inset-0 z-50 flex flex-col animate-fade-in"
          style={{ background: "var(--card)" }}
        >
          {/* 顶部栏 */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button
              onClick={() => setShowLyrics(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors"
            >
              <ChevronDown size={16} /> 收起歌词
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                }}
              >
                {currentSong.cover ? (
                  <img
                    src={currentSong.cover}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-lg text-white/50">♪</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 max-w-[200px]">
                <p className="font-outfit text-sm font-semibold text-primary truncate">{currentSong.title}</p>
                <p className="font-dm text-xs text-soft truncate">{currentSong.artist}</p>
              </div>
            </div>
            <div className="w-20" />
          </div>

          {/* 歌词区域 */}
          <div className="flex-1 min-h-0 mx-auto w-full max-w-2xl px-4">
            <Lyrics lyrics={lyrics} currentLyricIndex={currentLyricIndex} />
          </div>

          {/* 底部迷你控制栏 */}
          <div
            className="px-4 py-3 flex flex-col gap-2"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <span className="font-dm text-xs text-soft w-10">{formatTime(currentTime)}</span>
              <div className="flex-1 h-1.5 rounded-full cursor-pointer"
                style={{ background: "var(--range-track)" }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seek(ratio * duration);
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                  }}
                />
              </div>
              <span className="font-dm text-xs text-soft w-10 text-right">{formatTime(duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={playPrev}
                className="w-10 h-10 rounded-full flex items-center justify-center text-soft hover:text-primary transition-colors"
              >
                <SkipBack size={20} strokeWidth={2} />
              </button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform active:scale-95"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  boxShadow: "0 0 20px -2px var(--accent)",
                }}
              >
                {isPlaying ? (
                  <Pause size={22} strokeWidth={2} fill="white" />
                ) : (
                  <Play size={22} strokeWidth={2} fill="white" className="ml-0.5" />
                )}
              </button>
              <button
                onClick={playNext}
                className="w-10 h-10 rounded-full flex items-center justify-center text-soft hover:text-primary transition-colors"
              >
                <SkipForward size={20} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-dm text-white shadow-2xl animate-fade-in"
          style={{ background: "var(--accent)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
