import { useEffect, useState } from "react";
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
  ListMusic,
  Loader2,
  Download,
  Star,
  ListPlus,
  Check,
} from "lucide-react";
import usePlayerStore from "../store/playerStore";
import useAudioPlayer from "../hooks/useAudioPlayer";
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
  const songsCount = usePlayerStore((s) => s.songs.filter((s2) => s2.title).length);

  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const togglePlayMode = usePlayerStore((s) => s.togglePlayMode);
  const toggleFavoriteById = usePlayerStore((s) => s.toggleFavoriteById);
  const downloadSong = usePlayerStore((s) => s.downloadSong);
  const removeDownload = usePlayerStore((s) => s.removeDownload);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const addSongToPlaylist = usePlayerStore((s) => s.addSongToPlaylist);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);

  const { togglePlay, seek, changeVolume } = useAudioPlayer();

  const [showLyrics, setShowLyrics] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [toast, setToast] = useState("");

  const songs = usePlayerStore((s) => s.songs);

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
          className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-white"
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
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="clickable-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> 返回
        </button>
        <div className="font-dm text-xs text-soft">
          正在播放 · {currentSongIndex + 1}/{songs.filter((s) => s.title).length}
        </div>
        <div className="w-16" />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div
          className="relative rounded-3xl p-6 md:p-8 flex flex-col"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--accent), transparent 60%)",
            }}
          />
          <div className="relative flex-1 flex flex-col items-center justify-center gap-6 min-h-[400px]">
            <div
              className="relative w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden"
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

            <div className="text-center max-w-md">
              <h1 className="font-outfit font-bold text-2xl md:text-3xl text-primary leading-tight">
                {currentSong.title}
              </h1>
              <p className="font-dm text-sm text-soft mt-2">
                {currentSong.artist}
              </p>
              {currentSong.isLoading && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--accent)" }} />
                  <span className="font-dm text-xs text-faint">正在获取播放链接...</span>
                </div>
              )}
            </div>

            <div className="w-full max-w-md space-y-2">
              <div className="relative">
                <div
                  className="h-1.5 rounded-full overflow-hidden cursor-pointer group/progress"
                  style={{ background: "var(--range-track)" }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    seek(Math.max(0, Math.min(1, ratio)) * duration);
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
              </div>
              <div className="flex items-center justify-between text-xs font-dm text-soft">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={togglePlayMode}
                className="clickable-pill w-10 h-10 rounded-full flex items-center justify-center text-soft hover:text-primary"
                title={PlayModeLabel({ mode: playMode })}
              >
                <PlayModeIcon mode={playMode} />
              </button>
              <button
                onClick={playPrev}
                className="clickable-pill w-12 h-12 rounded-full flex items-center justify-center text-primary hover:bg-card-soft"
                aria-label="上一首"
              >
                <SkipBack size={22} strokeWidth={2} />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 clickable-pill"
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
                className="clickable-pill w-12 h-12 rounded-full flex items-center justify-center text-primary hover:bg-card-soft"
                aria-label="下一首"
              >
                <SkipForward size={22} strokeWidth={2} />
              </button>
              <button
                onClick={() => setShowLyrics((v) => !v)}
                className="clickable-pill w-10 h-10 rounded-full flex items-center justify-center text-soft hover:text-primary"
                aria-label="切换歌词"
                title="切换歌词"
              >
                {showLyrics ? <ListMusic size={18} /> : <Mic2 size={18} />}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
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
                          className="w-7 h-7 rounded-md flex items-center justify-center text-xs"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
                        >
                          ♪
                        </span>
                        <span className="flex-1 truncate font-dm">{pl.name}</span>
                        {contains && <Check size={12} className="text-accent" />}
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

          <div className="relative flex items-center gap-2 mt-4 pt-4 border-t border-default">
            {volume === 0 ? (
              <VolumeX size={18} className="text-soft" />
            ) : (
              <Volume2 size={18} className="text-soft" />
            )}
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => changeVolume(parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <span className="font-dm text-xs text-soft w-10 text-right">{volume}</span>
            <div className="ml-3 flex items-center gap-1 pl-3 border-l border-default">
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

        <div
          className="rounded-3xl p-4 md:p-6 min-h-[300px]"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-outfit font-semibold text-lg text-primary">
              {showLyrics ? "歌词" : "播放列表"}
            </h3>
            <span className="font-dm text-xs text-soft">
              {showLyrics ? `${lyrics.length} 行` : `${songs.filter((s) => s.title).length} 首`}
            </span>
          </div>
          <div className="h-[420px] lg:h-[480px]">
            {showLyrics ? (
              <Lyrics lyrics={lyrics} currentLyricIndex={currentLyricIndex} />
            ) : (
              <div className="space-y-1 overflow-y-auto h-full pr-1">
                {songs.filter((s) => s.title).map((song, idx) => {
                  const realIndex = songs.indexOf(song);
                  return (
                  <button
                    key={song.id}
                    onClick={() => usePlayerStore.getState().selectSong(realIndex)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-200 ${
                      realIndex === currentSongIndex
                        ? "clickable-ring"
                        : "hover:bg-card-soft"
                    }`}
                    style={
                      realIndex === currentSongIndex
                        ? {
                            background: "color-mix(in srgb, var(--accent) 18%, transparent)",
                            color: "var(--accent)",
                          }
                        : undefined
                    }
                  >
                    <span className="w-6 text-center text-xs font-dm">
                      {realIndex === currentSongIndex && isPlaying ? "▶" : idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-outfit text-sm truncate">{song.title}</p>
                      <p className="font-dm text-xs text-soft truncate">{song.artist}</p>
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

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
