import { useState, memo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Heart,
  Star,
  ListPlus,
  Check,
  Play,
  Pause,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import type { Song } from "../types";
import usePlayerStore from "../store/playerStore";
import { audioControls } from "../hooks/useAudioPlayer";
import AddToPlaylistSheet from "./AddToPlaylistSheet";

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
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
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

  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const toggleFavoriteById = usePlayerStore((s) => s.toggleFavoriteById);
  const downloadSong = usePlayerStore((s) => s.downloadSong);
  const removeDownload = usePlayerStore((s) => s.removeDownload);
  const playSong = usePlayerStore((s) => s.playSong);
  const showToast = usePlayerStore((s) => s.showToast);

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

  // 独立播放按钮：当前歌曲则切换播放/暂停；否则播放这首
  const handlePlayButton = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCurrent) {
        audioControls.togglePlay();
        return;
      }
      handlePlay();
    },
    [isCurrent, handlePlay]
  );

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteById(song.id);
    showToast(isFavorite ? "已取消喜欢" : "已添加到我喜欢的", "info");
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloadedNow) {
      removeDownload(song.id);
      showToast("已从下载中移除", "info");
    } else {
      downloadSong(song.id);
      showToast("已加入下载", "success");
    }
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(song);
    showToast("已加入待播放", "info");
  };

  const handlePickPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPlaylistSheet(true);
  };

  const handleToggleMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMoreMenu((prev) => !prev);
  };

  // 点击外部关闭更多菜单
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleDocClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMoreMenu(false);
    };
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showMoreMenu]);

  const getRankStyle = () => {
    if (rank === undefined) return null;
    if (rank === 0) return "bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-bold";
    if (rank === 1) return "bg-gradient-to-r from-gray-300 to-gray-400 text-black font-bold";
    if (rank === 2) return "bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold";
    return "";
  };

  return (
    <div
      className={`group relative flex items-center gap-2 px-sp-sm py-sp-sm rounded-btn-icon text-left transition-all duration-200 cursor-pointer ${
        isCurrent ? "song-row-active" : "hover:bg-card-soft"
      }`}
      role="button"
      tabIndex={0}
      aria-label={`播放 ${song.title} - ${song.artist}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlePlay(); } }}
      onClick={handlePlay}
    >
      {showRank && rank !== undefined ? (
        <span
          className={`w-6 h-6 rounded-cover flex items-center justify-center text-mono flex-shrink-0 ${getRankStyle()}`}
        >
          {rank + 1}
        </span>
      ) : index !== undefined ? (
        <span className="w-6 text-center flex-shrink-0 font-dm text-mono text-faint group-hover:hidden">
          {isCurrent ? (isPlaying ? "▶" : "⏸") : index + 1}
        </span>
      ) : null}

      {/* PRD 2.6 播放中：音波动画图标 */}
      {isCurrent && (
        <div className="w-6 h-6 flex items-end justify-center gap-[2px] flex-shrink-0">
          <div className="w-[3px] rounded-full animate-wave-1" style={{ background: "var(--accent)" }} />
          <div className="w-[3px] rounded-full animate-wave-2" style={{ background: "var(--accent)" }} />
          <div className="w-[3px] rounded-full animate-wave-3" style={{ background: "var(--accent)" }} />
          <div className="w-[3px] rounded-full animate-wave-4" style={{ background: "var(--accent)" }} />
        </div>
      )}

      {/* PRD 2.6 封面：40×40px 圆角8px */}
      {song.cover ? (
        <img
          src={song.cover}
          alt=""
          className="w-10 h-10 rounded-cover object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-10 h-10 rounded-cover flex-shrink-0 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <span className="text-white/60 text-sm">♪</span>
        </div>
      )}

      {/* PRD 2.4 字体规范：歌名 Outfit 14px 600，歌手 DM Sans 12px 400；完整显示不做截断 */}
      <div className="flex-1 min-w-0">
        <p className={`font-outfit text-body font-semibold flex items-start gap-1.5 break-words ${isCurrent ? "text-primary" : "text-primary"}`}>
          <span className="whitespace-normal break-words">{song.title}</span>
          {song.isDelisted && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-dm"
              style={{ background: "color-mix(in srgb, var(--error) 12%, transparent)", color: "var(--error)" }}>
              已下架
            </span>
          )}
        </p>
        <p className="font-dm text-caption text-soft whitespace-normal break-words">{song.artist}</p>
      </div>

      {song.isLoading && (
        <Loader2 className="w-4 h-4 text-faint animate-spin flex-shrink-0" />
      )}

      {/* 操作按钮：播放 / 喜欢 / 加入待播放，其他收纳到「更多」菜单 */}
      <div
        className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-auto pl-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="song-row-action inline-flex"
          onClick={handlePlayButton}
          title={isCurrent && isPlaying ? "暂停" : "播放"}
          aria-label={isCurrent && isPlaying ? "暂停" : "播放"}
        >
          {isCurrent && isPlaying ? (
            <Pause size={14} fill="currentColor" style={{ color: "var(--accent)" }} />
          ) : (
            <Play size={14} fill="currentColor" style={{ color: "var(--accent)" }} />
          )}
        </button>

        <button
          className={`song-row-action inline-flex ${isFavorite ? "is-favorite" : ""}`}
          onClick={handleToggleFavorite}
          title={isFavorite ? "已喜欢" : "喜欢"}
          aria-label={isFavorite ? "取消喜欢" : "喜欢"}
        >
          <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        <button
          className="song-row-action inline-flex"
          onClick={handleAddToQueue}
          title="加入待播放"
          aria-label="加入待播放"
        >
          <ListPlus size={14} />
        </button>

        {/* 更多按钮：点击展开其他操作 */}
        <div className="relative" ref={moreRef}>
          <button
            className={`song-row-action inline-flex ${showMoreMenu ? "is-active" : ""}`}
            onClick={handleToggleMore}
            title="更多"
            aria-label="更多"
            aria-expanded={showMoreMenu}
            aria-haspopup="menu"
          >
            <MoreHorizontal size={14} />
          </button>

          {showMoreMenu && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-card border shadow-lg py-1"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              {showPlaylistMenu && (
                <button
                  role="menuitem"
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-dm transition-colors hover:bg-card-soft"
                  style={{ color: "var(--text-soft)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(false);
                    handlePickPlaylist(e);
                  }}
                >
                  <Star size={14} />
                  <span>加入歌单</span>
                </button>
              )}

              <button
                role="menuitem"
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-dm transition-colors hover:bg-card-soft"
                style={{ color: "var(--text-soft)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(false);
                  handleDownload(e);
                }}
              >
                {isDownloadedNow ? <Check size={14} /> : <Download size={14} />}
                <span>{isDownloadedNow ? "已下载" : "下载"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 模块 4 - 单曲加入歌单（复用 AddToPlaylistSheet） */}
      {showPlaylistMenu && (
        <AddToPlaylistSheet
          open={showPlaylistSheet}
          onClose={() => setShowPlaylistSheet(false)}
          songIds={[song.id]}
          mode="single"
          onDone={() => {
            // Sheet 内部已做 Toast
          }}
        />
      )}
    </div>
  );
});

export default SongRow;
