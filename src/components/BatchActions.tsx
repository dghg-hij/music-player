import { useState } from "react";
import { ListPlus, Heart, Download, Star, XCircle } from "lucide-react";
import usePlayerStore from "../store/playerStore";
import type { Song } from "../types";

interface BatchActionsProps {
  songs: Song[];
}

export default function BatchActions({ songs }: BatchActionsProps) {
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const toggleFavoriteById = usePlayerStore((s) => s.toggleFavoriteById);
  const downloadSong = usePlayerStore((s) => s.downloadSong);
  const removeDownload = usePlayerStore((s) => s.removeDownload);
  const addSongToPlaylist = usePlayerStore((s) => s.addSongToPlaylist);
  const playlists = usePlayerStore((s) => s.playlists);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const queue = usePlayerStore((s) => s.queue);
  const downloads = usePlayerStore((s) => s.downloads);

  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [toast, setToast] = useState("");

  if (songs.length === 0) return null;

  const handleAddAllToQueue = () => {
    songs.forEach((s) => addToQueue(s));
    setToast(`已将 ${songs.length} 首加入待播放`);
  };

  const handleFavoriteAll = () => {
    const unfavorited = songs.filter((s) => !s.isFavorite);
    if (unfavorited.length === 0) {
      // 全部已喜欢，则批量取消
      songs.forEach((s) => toggleFavoriteById(s.id));
      setToast(`已取消喜欢 ${songs.length} 首`);
    } else {
      unfavorited.forEach((s) => toggleFavoriteById(s.id));
      setToast(`已喜欢 ${unfavorited.length} 首`);
    }
  };

  const handleDownloadAll = () => {
    const notDownloaded = songs.filter((s) => !downloads.includes(s.id));
    if (notDownloaded.length === 0) {
      // 全部已下载，则批量取消下载
      songs.forEach((s) => removeDownload(s.id));
      setToast(`已取消下载 ${songs.length} 首`);
    } else {
      notDownloaded.forEach((s) => downloadSong(s.id));
      setToast(`已下载 ${notDownloaded.length} 首`);
    }
  };

  const handleRemoveFromQueue = () => {
    const inQueue = songs.filter((s) => queue.some((q) => q.id === s.id));
    if (inQueue.length === 0) {
      setToast("选中的歌曲均不在待播放列表中");
      return;
    }
    inQueue.forEach((s) => removeFromQueue(s.id));
    setToast(`已从待播放移除 ${inQueue.length} 首`);
  };

  const handleAddToPlaylist = (playlistId: string) => {
    songs.forEach((s) => addSongToPlaylist(playlistId, s.id));
    setShowPlaylistPicker(false);
    const pl = playlists.find((p) => p.id === playlistId);
    setToast(`已加入「${pl?.name}」`);
  };

  const handleCreatePlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const id = createPlaylist(name);
    songs.forEach((s) => addSongToPlaylist(id, s.id));
    setNewPlaylistName("");
    setShowCreateInput(false);
    setShowPlaylistPicker(false);
    setToast(`已创建「${name}」并加入`);
  };

  const allFavorited = songs.every((s) => s.isFavorite);
  const allDownloaded = songs.every((s) => downloads.includes(s.id));
  const anyInQueue = songs.some((s) => queue.some((q) => q.id === s.id));

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAddAllToQueue}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm flex items-center gap-1.5 text-primary"
          style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
        >
          <ListPlus size={12} /> 全部待播放
        </button>
        {anyInQueue && (
          <button
            onClick={handleRemoveFromQueue}
            className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm flex items-center gap-1.5 text-primary"
            style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
          >
            <XCircle size={12} /> 移出待播放
          </button>
        )}
        <button
          onClick={handleFavoriteAll}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm flex items-center gap-1.5 text-primary"
          style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
        >
          <Heart size={12} fill={allFavorited ? "currentColor" : "none"} /> {allFavorited ? "取消全部喜欢" : "全部喜欢"}
        </button>
        <button
          onClick={handleDownloadAll}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm flex items-center gap-1.5 text-primary"
          style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
        >
          <Download size={12} /> {allDownloaded ? "取消全部下载" : "全部下载"}
        </button>
        <button
          onClick={() => setShowPlaylistPicker((v) => !v)}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm flex items-center gap-1.5 text-primary"
          style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
        >
          <Star size={12} /> 全部加入歌单
        </button>
      </div>

      {showPlaylistPicker && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowPlaylistPicker(false)} />
          <div
            className="absolute left-0 top-full mt-2 w-64 z-20 card-surface p-3 shadow-2xl animate-fade-in"
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
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {playlists.length === 0 && !showCreateInput && (
                <p className="text-xs text-soft py-3 text-center">还没有歌单</p>
              )}
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm hover:bg-card-soft text-primary transition-colors"
                >
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs text-white"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
                  >
                    ♪
                  </span>
                  <span className="flex-1 truncate font-dm">{pl.name}</span>
                </button>
              ))}
            </div>
            {showCreateInput ? (
              <div className="mt-2 flex gap-1">
                <input
                  autoFocus
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
                className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-dm text-soft hover:text-primary hover:bg-card-soft"
              >
                <Star size={12} /> 新建歌单
              </button>
            )}
          </div>
        </>
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
