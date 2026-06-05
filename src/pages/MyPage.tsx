import { useState } from "react";
import {
  Heart,
  Download,
  Clock,
  Star,
  ListMusic,
  Music2,
  Plus,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import usePlayerStore from "../store/playerStore";
import SongRow from "../components/SongRow";
import type { Song } from "../types";

type MyTab = "liked" | "favorites" | "downloads" | "recent" | "playlists";

const TABS: { id: MyTab; label: string; icon: typeof Heart }[] = [
  { id: "liked", label: "我喜欢", icon: Heart },
  { id: "favorites", label: "收藏", icon: Star },
  { id: "downloads", label: "下载", icon: Download },
  { id: "recent", label: "最近播放", icon: Clock },
  { id: "playlists", label: "我的歌单", icon: ListMusic },
];

export default function MyPage() {
  const [tab, setTab] = useState<MyTab>("liked");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);

  const songs = usePlayerStore((s) => s.songs);
  const downloads = usePlayerStore((s) => s.downloads);
  const recentPlays = usePlayerStore((s) => s.recentPlays);
  const playlists = usePlayerStore((s) => s.playlists);
  const clearRecent = usePlayerStore((s) => s.clearRecent);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const deletePlaylist = usePlayerStore((s) => s.deletePlaylist);
  const removeSongFromPlaylist = usePlayerStore((s) => s.removeSongFromPlaylist);

  const liked = songs.filter((s) => s.isFavorite && s.title);
  const downloaded = songs.filter((s) => downloads.includes(s.id) && s.title);
  const recent = recentPlays
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is Song => Boolean(s && s.title));

  const renderList = (list: Song[], emptyText: string) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-16">
          <Music2 size={36} className="mx-auto text-faint mb-3" />
          <p className="font-dm text-sm text-soft">{emptyText}</p>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        {list.map((song, i) => (
          <SongRow key={song.id} song={song} index={i} />
        ))}
      </div>
    );
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const id = createPlaylist(name);
    setNewName("");
    setShowCreate(false);
    setSelectedPlaylist(id);
    setTab("playlists");
  };

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-8"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--card)) 0%, var(--card) 70%)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "var(--accent)" }}
        />
        <h1 className="font-outfit font-bold text-3xl md:text-4xl text-primary">
          我的音乐
        </h1>
        <p className="font-dm text-sm text-soft mt-2">
          集中管理你喜欢的歌曲、收藏的榜单、下载的曲目与最近播放
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to="/"
            className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary"
            style={{
              background: "var(--card-soft)",
              border: "1px solid var(--border-strong)",
            }}
          >
            ← 继续探索
          </Link>
          <span className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary inline-flex items-center gap-1.5"
            style={{
              background: "var(--card-soft)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <Heart size={12} className="text-red-500" fill="currentColor" /> {liked.length}
          </span>
          <span className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary inline-flex items-center gap-1.5"
            style={{
              background: "var(--card-soft)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <Download size={12} /> {downloaded.length}
          </span>
          <span className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary inline-flex items-center gap-1.5"
            style={{
              background: "var(--card-soft)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <Clock size={12} /> {recent.length}
          </span>
          <span className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary inline-flex items-center gap-1.5"
            style={{
              background: "var(--card-soft)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <ListMusic size={12} /> {playlists.length}
          </span>
        </div>
      </div>

      <div className="card-surface p-1.5">
        <div className="flex items-center gap-1 p-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setSelectedPlaylist(null);
                }}
                className="clickable-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-dm whitespace-nowrap transition-all duration-200"
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(135deg, var(--accent), var(--accent-2))",
                        color: "white",
                      }
                    : { color: "var(--text-soft)" }
                }
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-surface p-2 md:p-4">
        {tab === "liked" && renderList(liked, "还没有喜欢的歌曲，去首页发现一下吧")}
        {tab === "favorites" && renderList(downloaded, "收藏夹空空如也")}
        {tab === "downloads" && (
          <>
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="font-dm text-xs text-soft">
                共 {downloaded.length} 首已下载歌曲
              </p>
            </div>
            {renderList(downloaded, "暂无下载歌曲")}
          </>
        )}
        {tab === "recent" && (
          <>
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="font-dm text-xs text-soft">
                最近播放 · 共 {recent.length} 首
              </p>
              {recent.length > 0 && (
                <button
                  onClick={clearRecent}
                  className="text-xs text-soft hover:text-red-500 transition-colors flex items-center gap-1 clickable-pill px-2 py-1"
                >
                  <Trash2 size={12} /> 清空
                </button>
              )}
            </div>
            {renderList(recent, "暂无最近播放")}
          </>
        )}
        {tab === "playlists" && (
          <div>
            {selectedPlaylist ? (
              <PlaylistDetail
                playlistId={selectedPlaylist}
                onBack={() => setSelectedPlaylist(null)}
                onRemoveSong={(songId) =>
                  removeSongFromPlaylist(selectedPlaylist, songId)
                }
              />
            ) : (
              <PlaylistList
                playlists={playlists}
                onSelect={(id) => setSelectedPlaylist(id)}
                onDelete={(id) => deletePlaylist(id)}
                onCreate={() => setShowCreate(true)}
              />
            )}

            {showCreate && (
              <div className="mt-4 flex gap-2 p-3 rounded-2xl" style={{ background: "var(--card-soft)" }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setShowCreate(false);
                  }}
                  placeholder="新歌单名称"
                  className="flex-1 bg-transparent text-primary text-sm rounded-lg px-3 py-2 outline-none border border-default focus:border-accent"
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-white"
                  style={{ background: "var(--accent)" }}
                >
                  创建
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                  }}
                  className="clickable-pill px-3 py-2 rounded-full text-sm font-dm text-soft"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaylistList({
  playlists,
  onSelect,
  onDelete,
  onCreate,
}: {
  playlists: { id: string; name: string; songIds: number[]; createdAt: number }[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  if (playlists.length === 0) {
    return (
      <div className="text-center py-16">
        <ListMusic size={36} className="mx-auto text-faint mb-3" />
        <p className="font-dm text-sm text-soft mb-4">还没有创建歌单</p>
        <button
          onClick={onCreate}
          className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-white"
          style={{ background: "var(--accent)" }}
        >
          <Plus size={14} className="inline mr-1" /> 新建歌单
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-2">
        <p className="font-dm text-xs text-soft">共 {playlists.length} 个歌单</p>
        <button
          onClick={onCreate}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary"
          style={{ background: "var(--card-soft)" }}
        >
          <Plus size={12} className="inline mr-1" /> 新建
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {playlists.map((pl) => (
          <div
            key={pl.id}
            className="relative clickable-ring"
            style={{ borderRadius: "1rem" }}
          >
            <button
              onClick={() => onSelect(pl.id)}
              className="w-full text-left p-4 rounded-2xl transition-all duration-200"
              style={{
                background: "var(--card-soft)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-2))",
                }}
              >
                <ListMusic size={20} className="text-white" />
              </div>
              <h3 className="font-outfit font-semibold text-sm text-primary truncate">
                {pl.name}
              </h3>
              <p className="font-dm text-xs text-soft mt-1">
                {pl.songIds.length} 首歌曲
              </p>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(pl.id);
              }}
              className="absolute top-2 right-2 song-row-action"
              title="删除歌单"
              aria-label="删除歌单"
              style={{ width: "24px", height: "24px" }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaylistDetail({
  playlistId,
  onBack,
  onRemoveSong,
}: {
  playlistId: string;
  onBack: () => void;
  onRemoveSong: (songId: number) => void;
}) {
  const playlists = usePlayerStore((s) => s.playlists);
  const songs = usePlayerStore((s) => s.songs);
  const playlist = playlists.find((p) => p.id === playlistId);
  if (!playlist) {
    return (
      <div className="text-center py-12">
        <p className="font-dm text-sm text-soft">歌单不存在</p>
        <button
          onClick={onBack}
          className="clickable-pill mt-3 px-3 py-1.5 rounded-full text-xs font-dm text-primary"
          style={{ background: "var(--card-soft)" }}
        >
          返回
        </button>
      </div>
    );
  }
  const list = playlist.songIds
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is Song => Boolean(s && s.title));

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-2">
        <button
          onClick={onBack}
          className="font-dm text-xs text-soft hover:text-primary transition-colors clickable-pill px-3 py-1.5"
        >
          ← 返回歌单列表
        </button>
        <h3 className="font-outfit font-semibold text-lg text-primary">
          {playlist.name}
        </h3>
        <span className="font-dm text-xs text-soft">{list.length} 首</span>
      </div>
      {list.length === 0 ? (
        <div className="text-center py-12">
          <Music2 size={36} className="mx-auto text-faint mb-3" />
          <p className="font-dm text-sm text-soft">这个歌单还是空的</p>
          <p className="font-dm text-xs text-faint mt-1">
            在歌曲右侧点击 ★ 即可加入此歌单
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {list.map((song, i) => (
            <div key={song.id} className="group flex items-center gap-1">
              <div className="flex-1 min-w-0">
                <SongRow song={song} index={i} showPlaylistMenu={false} />
              </div>
              <button
                onClick={() => onRemoveSong(song.id)}
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
  );
}
