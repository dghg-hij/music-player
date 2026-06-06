import { useState, useRef, useEffect, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Heart,
  Star,
  ListPlus,
  Plus,
  Check,
  Play,
  X,
  Loader2,
} from "lucide-react";
import type { Song } from "../types";
import usePlayerStore from "../store/playerStore";

interface SongRowProps {
  song: Song;
  index?: number;
  showRank?: boolean;
  rank?: number;
  onPlay?: (song: Song) => void;
  showPlaylistMenu?: boolean;
}

const SongRow = memo(function SongRow({
  song,
  index,
  showRank = false,
  rank,
  onPlay,
  showPlaylistMenu = true,
}: SongRowProps) {
  const navigate = useNavigate();
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [toast, setToast] = useState<string | null>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 精确订阅，只订阅需要的值，避免遍历整个 songs 数组
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  // 用 song.id 直接查找，避免每次遍历
  const songIndexInStore = usePlayerStore((s) => {
    const idx = s.songs.findIndex((ss) => ss.id === song.id);
    return idx;
  });
  const isFavorite = usePlayerStore((s) => {
    if (song.isFavorite) return true;
    const found = s.songs.find((ss) => ss.id === song.id);
    return !!found?.isFavorite;
  });
  const isDownloadedNow = usePlayerStore((s) => s.downloads.includes(song.id));
  const playlists = usePlayerStore((s) => s.playlists);

  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const toggleFavoriteById = usePlayerStore((s) => s.toggleFavoriteById);
  const downloadSong = usePlayerStore((s) => s.downloadSong);
  const removeDownload = usePlayerStore((s) => s.removeDownload);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const addSongToPlaylist = usePlayerStore((s) => s.addSongToPlaylist);
  const playSong = usePlayerStore((s) => s.playSong);

  const isCurrent = songIndexInStore === currentSongIndex;

  const handlePlay = useCallback(() => {
    if (onPlay) {
      onPlay(song);
    } else {
      playSong(song);
    }
    navigate("/play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [onPlay, song, playSong, navigate]);

  useEffect(() => {
    if (showCreateInput && inputRef.current) inputRef.current.focus();
  }, [showCreateInput]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!showPlaylistPicker) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPlaylistPicker(false);
        setShowCreateInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPlaylistPicker]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteById(song.id);
    setToast(isFavorite ? "已取消喜欢" : "已添加到我喜欢的");
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloadedNow) {
      removeDownload(song.id);
      setToast("已从下载中移除");
    } else {
      downloadSong(song.id);
      setToast("已加入下载");
    }
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(song);
    setToast("已加入待播放");
  };

  const handlePickPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPlaylistPicker((v) => !v);
    setShowCreateInput(false);
  };

  const handleSelectPlaylist = (playlistId: string, name: string) => {
    addSongToPlaylist(playlistId, song.id);
    setShowPlaylistPicker(false);
    setToast(`已加入歌单「${name}」`);
  };

  const handleCreatePlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const id = createPlaylist(name);
    addSongToPlaylist(id, song.id);
    setNewPlaylistName("");
    setShowCreateInput(false);
    setShowPlaylistPicker(false);
    setToast(`已创建并加入「${name}」`);
  };

  const getRankStyle = () => {
    if (rank === undefined) return null;
    if (rank === 0) return "bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-bold";
    if (rank === 1) return "bg-gradient-to-r from-gray-300 to-gray-400 text-black font-bold";
    if (rank === 2) return "bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold";
    return "";
  };

  return (
    <div
      className={`group relative flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all duration-200 cursor-pointer ${
        isCurrent ? "bg-card-soft" : "hover:bg-card-soft"
      }`}
      onClick={handlePlay}
    >
      {showRank && rank !== undefined ? (
        <span
          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0 ${getRankStyle()}`}
        >
          {rank + 1}
        </span>
      ) : index !== undefined ? (
        <span className="w-6 text-center flex-shrink-0 font-dm text-xs text-faint group-hover:hidden">
          {isCurrent ? (isPlaying ? "▶" : "⏸") : index + 1}
        </span>
      ) : null}

      {isCurrent && (
        <div className="w-6 h-6 flex items-end justify-center gap-[2px] flex-shrink-0">
          <div className="w-[3px] bg-accent rounded-full animate-wave-1" />
          <div className="w-[3px] bg-accent rounded-full animate-wave-2" />
          <div className="w-[3px] bg-accent rounded-full animate-wave-3" />
          <div className="w-[3px] bg-accent rounded-full animate-wave-4" />
        </div>
      )}

      {song.cover ? (
        <img
          src={song.cover}
          alt=""
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <span className="text-white/60 text-sm">♪</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`font-outfit text-sm font-semibold truncate ${isCurrent ? "text-primary" : "text-primary"}`}>
          {song.title}
        </p>
        <p className="font-dm text-xs text-soft truncate">{song.artist}</p>
      </div>

      {song.isLoading && (
        <Loader2 className="w-4 h-4 text-faint animate-spin flex-shrink-0" />
      )}

      <div
        className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-auto pl-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="song-row-action inline-flex w-6 h-6 sm:w-7 sm:h-7"
          onClick={handleDownload}
          title={isDownloadedNow ? "已下载" : "下载"}
          aria-label={isDownloadedNow ? "已下载" : "下载"}
        >
          {isDownloadedNow ? <Check size={12} /> : <Download size={12} />}
        </button>

        <button
          className={`song-row-action inline-flex w-6 h-6 sm:w-7 sm:h-7 ${isFavorite ? "is-favorite" : ""}`}
          onClick={handleToggleFavorite}
          title={isFavorite ? "已喜欢" : "喜欢"}
          aria-label={isFavorite ? "取消喜欢" : "喜欢"}
        >
          <Heart size={12} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        <button
          className="song-row-action inline-flex w-6 h-6 sm:w-7 sm:h-7"
          onClick={handlePickPlaylist}
          title="加入歌单"
          aria-label="加入歌单"
        >
          <Star size={12} />
        </button>

        <button
          className="song-row-action inline-flex w-6 h-6 sm:w-7 sm:h-7"
          onClick={handleAddToQueue}
          title="加入播放列表"
          aria-label="加入播放列表"
        >
          <ListPlus size={12} />
        </button>

        <button
          className="song-row-action inline-flex w-6 h-6 sm:w-7 sm:h-7"
          onClick={handlePlay}
          title="播放"
          aria-label="播放"
          style={{ color: "var(--accent)" }}
        >
          <Play size={12} fill="currentColor" />
        </button>
      </div>

      {showPlaylistPicker && showPlaylistMenu && (
        <div
          ref={popoverRef}
          className="absolute right-2 top-full mt-2 w-64 z-20 card-surface p-3 shadow-2xl animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-outfit text-sm font-semibold text-primary">加入歌单</span>
            <button
              onClick={() => setShowPlaylistPicker(false)}
              className="text-soft hover:text-primary transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {playlists.length === 0 && !showCreateInput && (
            <p className="text-xs text-soft py-3 text-center">还没有歌单，创建一个吧</p>
          )}

          <div className="space-y-1 max-h-40 overflow-y-auto">
            {playlists.map((pl) => {
              const contains = pl.songIds.includes(song.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => handleSelectPlaylist(pl.id, pl.name)}
                  disabled={contains}
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
                ref={inputRef}
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePlaylist();
                  if (e.key === "Escape") setShowCreateInput(false);
                }}
                placeholder="新歌单名称"
                className="flex-1 bg-card-soft text-primary text-sm rounded-lg px-2 py-1.5 outline-none border border-default focus:border-accent"
              />
              <button
                onClick={handleCreatePlaylist}
                className="px-2 py-1.5 rounded-lg text-xs font-dm text-white"
                style={{ background: "var(--accent)" }}
              >
                创建
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateInput(true)}
              className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-dm text-soft hover:text-primary hover:bg-card-soft transition-colors"
            >
              <Plus size={12} /> 新建歌单
            </button>
          )}
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
});

export default SongRow;
