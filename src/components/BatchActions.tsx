import { useState } from "react";
import { ListPlus, Heart, Download, Star, XCircle } from "lucide-react";
import usePlayerStore from "../store/playerStore";
import AddToPlaylistSheet from "./AddToPlaylistSheet";
import type { Song } from "../types";

interface BatchActionsProps {
  songs: Song[];
}

export default function BatchActions({ songs }: BatchActionsProps) {
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const toggleFavoriteById = usePlayerStore((s) => s.toggleFavoriteById);
  const downloadSong = usePlayerStore((s) => s.downloadSong);
  const removeDownload = usePlayerStore((s) => s.removeDownload);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const queue = usePlayerStore((s) => s.queue);
  const downloads = usePlayerStore((s) => s.downloads);
  const showToast = usePlayerStore((s) => s.showToast);

  const [showSheet, setShowSheet] = useState(false);

  if (songs.length === 0) return null;

  const handleAddAllToQueue = () => {
    songs.forEach((s) => addToQueue(s));
    showToast(`已将 ${songs.length} 首加入待播放`, "success");
  };

  const handleFavoriteAll = () => {
    const unfavorited = songs.filter((s) => !s.isFavorite);
    if (unfavorited.length === 0) {
      // 全部已喜欢，则批量取消（E2 评审：按钮文案动态切换）
      songs.forEach((s) => toggleFavoriteById(s.id));
      showToast(`已取消喜欢 ${songs.length} 首`, "info");
    } else {
      unfavorited.forEach((s) => toggleFavoriteById(s.id));
      showToast(`已喜欢 ${unfavorited.length} 首`, "success");
    }
  };

  const handleDownloadAll = () => {
    const notDownloaded = songs.filter((s) => !downloads.includes(s.id));
    if (notDownloaded.length === 0) {
      songs.forEach((s) => removeDownload(s.id));
      showToast(`已取消下载 ${songs.length} 首`, "info");
    } else {
      notDownloaded.forEach((s) => downloadSong(s.id));
      showToast(`已下载 ${notDownloaded.length} 首`, "success");
    }
  };

  const handleRemoveFromQueue = () => {
    const inQueue = songs.filter((s) => queue.some((q) => q.id === s.id));
    if (inQueue.length === 0) {
      showToast("选中的歌曲均不在待播放列表中", "info");
      return;
    }
    inQueue.forEach((s) => removeFromQueue(s.id));
    showToast(`已从待播放移除 ${inQueue.length} 首`, "success");
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
          onClick={() => setShowSheet(true)}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm flex items-center gap-1.5 text-primary"
          style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
        >
          <Star size={12} /> 全部加入歌单
        </button>
      </div>

      {/* 模块 4 - 批量加入歌单（复用 AddToPlaylistSheet） */}
      <AddToPlaylistSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        songIds={songs.map((s) => s.id)}
        mode="batch"
        onDone={(r) => {
          // 已在 Sheet 内做了 Toast，这里无需重复
          void r;
        }}
      />
    </div>
  );
}
