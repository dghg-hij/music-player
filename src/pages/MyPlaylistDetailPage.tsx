import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Heart,
  ListMusic,
  Music2,
  Play,
  Star,
  Trash2,
  Shuffle,
  GripVertical,
} from "lucide-react";
import usePlayerStore from "../store/playerStore";
import type { Song } from "../types";
import { PLAYLIST_MAX_SONGS } from "../types";
import SongRow from "../components/SongRow";
import EditPlaylistModal from "../components/EditPlaylistModal";

/**
 * 我创建/收藏的本地歌单详情页 - PRD 3.4.3 / 3.4.4
 *
 * 路由 /my/playlist/:id - 与外部歌单详情（/playlist/:id）分开
 * - 大封面 + 名称 + 简介 + 操作（编辑/收藏/删除/播放全部/随机）
 * - 歌曲列表支持拖拽排序、移除
 * - 上限 1000 首的视觉提示
 * - 空状态 PRD 6.4
 */
export default function MyPlaylistDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const playlist = usePlayerStore((s) => s.playlists.find((p) => p.id === id));
  const songs = usePlayerStore((s) => s.songs);
  const removeSongFromPlaylist = usePlayerStore((s) => s.removeSongFromPlaylist);
  const removeSongsFromPlaylist = usePlayerStore((s) => s.removeSongsFromPlaylist);
  const reorderPlaylistSongs = usePlayerStore((s) => s.reorderPlaylistSongs);
  const toggleCollectPlaylist = usePlayerStore((s) => s.toggleCollectPlaylist);
  const isCollected = usePlayerStore((s) =>
    id ? s.collectedPlaylists.includes(id) : false
  );
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const showToast = usePlayerStore((s) => s.showToast);

  const [editOpen, setEditOpen] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartIndexRef = useRef<number | null>(null);

  const list = useMemo<Song[]>(() => {
    if (!playlist) return [];
    return playlist.songIds
      .map((sid) => songs.find((s) => s.id === sid))
      .filter((s): s is Song => Boolean(s && s.title));
  }, [playlist, songs]);

  // 收藏状态变化 toast
  const handleToggleCollect = () => {
    toggleCollectPlaylist(id);
    showToast(
      isCollected ? "已取消收藏" : "已收藏到「我的歌单」",
      "success"
    );
  };

  const handlePlayAll = (shuffle = false) => {
    if (list.length === 0) {
      showToast("歌单是空的", "info");
      return;
    }
    const order = shuffle ? [...list].sort(() => Math.random() - 0.5) : list;
    order.forEach((s) => addToQueue(s));
    playSong(order[0]);
    showToast(`已开始播放「${playlist?.name}」`, "success");
    navigate("/play");
  };

  // 拖拽排序（HTML5 DnD）
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragStartIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {
      // 忽略
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = dragStartIndexRef.current;
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragStartIndexRef.current = null;
    if (from === null || from === index) return;
    reorderPlaylistSongs(id, from, index);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragStartIndexRef.current = null;
  };

  if (!playlist) {
    // PRD 6.4：歌单被删除 → 提示 + 自动返回上一页
    return <PlaylistNotFound navigate={navigate} />;
  }

  const remaining = PLAYLIST_MAX_SONGS - playlist.songIds.length;

  return (
    <div className="space-y-6">
      {/* 顶部封面 + 信息 */}
      <div
        className="relative overflow-hidden rounded-card p-6 md:p-8 glass"
        style={{
          background: playlist.cover
            ? `linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.85) 100%), url(${playlist.cover}) center/cover`
            : "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--card)) 0%, color-mix(in srgb, var(--accent-2) 6%, var(--card)) 100%)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 clickable-pill inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-caption font-dm"
          style={{ background: "rgba(0,0,0,0.3)", color: "white", backdropFilter: "blur(8px)" }}
        >
          <ArrowLeft size={12} /> 返回
        </button>

        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          <div
            className="w-44 h-44 md:w-52 md:h-52 rounded-card flex-shrink-0 flex items-center justify-center shadow-2xl"
            style={{
              background: playlist.cover
                ? `url(${playlist.cover}) center/cover`
                : "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            {!playlist.cover && <ListMusic size={56} className="text-white/80" />}
          </div>

          <div className="flex-1 min-w-0 text-white">
            <p className="text-caption opacity-80 mb-1">歌单</p>
            <h1 className="font-outfit font-bold text-3xl md:text-4xl truncate">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="font-dm text-body opacity-90 mt-2 line-clamp-2">
                {playlist.description}
              </p>
            )}
            <p className="font-dm text-caption opacity-70 mt-2">
              {playlist.creatorName ? `${playlist.creatorName} · ` : ""}
              {playlist.songIds.length} 首歌曲
              {isCollected && <span className="ml-2">· 已收藏</span>}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                onClick={() => handlePlayAll(false)}
                disabled={list.length === 0}
                className="clickable-pill inline-flex items-center gap-1.5 px-5 py-2 rounded-btn-pill text-body font-dm text-white transition-opacity"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  opacity: list.length === 0 ? 0.4 : 1,
                }}
              >
                <Play size={14} fill="currentColor" /> 播放全部
              </button>
              <button
                onClick={() => handlePlayAll(true)}
                disabled={list.length === 0}
                className="clickable-pill inline-flex items-center gap-1.5 px-3 py-2 rounded-btn-pill text-body font-dm"
                style={{ background: "rgba(255,255,255,0.15)", color: "white", backdropFilter: "blur(8px)" }}
              >
                <Shuffle size={14} /> 随机播放
              </button>
              <button
                onClick={handleToggleCollect}
                className="clickable-pill inline-flex items-center gap-1.5 px-3 py-2 rounded-btn-pill text-body font-dm"
                style={{
                  background: isCollected ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.15)",
                  color: "white",
                  backdropFilter: "blur(8px)",
                }}
                aria-label={isCollected ? "取消收藏" : "收藏歌单"}
              >
                <Heart
                  size={14}
                  fill={isCollected ? "#ef4444" : "transparent"}
                  stroke={isCollected ? "#ef4444" : "currentColor"}
                />
                {isCollected ? "已收藏" : "收藏"}
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="clickable-pill inline-flex items-center gap-1.5 px-3 py-2 rounded-btn-pill text-body font-dm"
                style={{ background: "rgba(255,255,255,0.15)", color: "white", backdropFilter: "blur(8px)" }}
                aria-label="编辑歌单"
              >
                <Edit3 size={14} /> 编辑
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 列表区 */}
      <div className="card-surface p-2 md:p-4">
        <div className="flex items-center justify-between mb-3 px-2">
          <p className="font-dm text-caption text-soft">
            歌曲列表 · {list.length} / {PLAYLIST_MAX_SONGS} 首
            {remaining <= 50 && remaining > 0 && (
              <span className="ml-1" style={{ color: "var(--warning)" }}>
                · 剩余 {remaining} 个名额
              </span>
            )}
          </p>
          {list.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`确定清空「${playlist.name}」中的全部歌曲？`)) {
                  removeSongsFromPlaylist(id, list.map((s) => s.id));
                  showToast("已清空歌单", "success");
                }
              }}
              className="text-caption text-soft hover:text-red-500 transition-colors flex items-center gap-1 clickable-pill px-2 py-1"
            >
              <Trash2 size={12} /> 清空
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="text-center py-16">
            <Music2 size={36} className="mx-auto text-faint mb-3" />
            <p className="font-dm text-body text-soft">这个歌单还是空的</p>
            <p className="font-dm text-caption text-faint mt-1">
              在歌曲列表的「更多」中点击 <Star size={11} className="inline" /> 即可加入此歌单
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1 mt-3 px-4 py-1.5 rounded-btn-pill text-caption font-dm clickable-pill"
              style={{ background: "var(--card-soft)" }}
            >
              去发现音乐
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {list.map((song, i) => (
              <div
                key={song.id}
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className="group flex items-center gap-1 rounded-btn-icon transition-all"
                style={{
                  background:
                    dragOverIndex === i && draggingIndex !== i
                      ? "var(--card-soft)"
                      : "transparent",
                  borderTop:
                    dragOverIndex === i && draggingIndex !== null && draggingIndex < i
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                  borderBottom:
                    dragOverIndex === i && draggingIndex !== null && draggingIndex > i
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                  opacity: draggingIndex === i ? 0.5 : 1,
                }}
              >
                <div
                  className="opacity-0 group-hover:opacity-100 text-faint cursor-grab px-1 flex-shrink-0"
                  title="拖拽排序"
                  aria-label="拖拽排序"
                >
                  <GripVertical size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <SongRow song={song} index={i} showPlaylistMenu={false} />
                </div>
                <button
                  onClick={() => {
                    removeSongFromPlaylist(id, song.id);
                    showToast("已从歌单移除", "info");
                  }}
                  className="opacity-0 group-hover:opacity-100 song-row-action flex-shrink-0"
                  title="从歌单移除"
                  aria-label="从歌单移除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditPlaylistModal
        open={editOpen}
        playlistId={editOpen ? id : null}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}

/** PRD 6.4：歌单不存在时自动返回上一页 */
function PlaylistNotFound({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  useEffect(() => {
    usePlayerStore.getState().showToast("歌单不存在", "warning");
    const t = setTimeout(() => navigate("/my"), 1500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="card-surface p-8 text-center">
      <ListMusic size={36} className="mx-auto text-faint mb-3" />
      <p className="font-dm text-body text-primary">歌单不存在或已被删除</p>
      <p className="font-dm text-caption text-soft mt-2">正在返回...</p>
    </div>
  );
}
