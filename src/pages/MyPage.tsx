import { useState, useMemo } from "react";
import {
  Heart,
  Download,
  Clock,
  Star,
  ListMusic,
  Music2,
  Plus,
  Trash2,
  LogIn,
  Edit3,
  CheckSquare,
  Square,
  ChevronLeft,
  Headphones,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import usePlayerStore from "../store/playerStore";
import useAuthStore from "../store/authStore";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import CreatePlaylistModal from "../components/CreatePlaylistModal";
import { CURATED_PLAYLISTS, type CuratedPlaylist } from "../data/songs";
import type { Song } from "../types";

type MyTab = "playlists" | "liked" | "recent" | "downloads";

const TABS: { id: MyTab; label: string; icon: typeof Heart }[] = [
  { id: "playlists", label: "我的歌单", icon: ListMusic },
  { id: "liked", label: "我喜欢", icon: Heart },
  { id: "recent", label: "最近播放", icon: Clock },
  { id: "downloads", label: "下载管理", icon: Download },
];

export default function MyPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<MyTab>("playlists");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [selectedCurated, setSelectedCurated] = useState<string | null>(null);
  const [downloadSelectMode, setDownloadSelectMode] = useState(false);
  const [selectedDownloads, setSelectedDownloads] = useState<Set<number>>(new Set());

  const songs = usePlayerStore((s) => s.songs);
  const downloads = usePlayerStore((s) => s.downloads);
  const recentPlays = usePlayerStore((s) => s.recentPlays);
  const playlists = usePlayerStore((s) => s.playlists);
  const collectedPlaylists = usePlayerStore((s) => s.collectedPlaylists);
  const clearRecent = usePlayerStore((s) => s.clearRecent);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const deletePlaylist = usePlayerStore((s) => s.deletePlaylist);
  const removeSongFromPlaylist = usePlayerStore((s) => s.removeSongFromPlaylist);
  const removeDownloads = usePlayerStore((s) => s.removeDownloads);
  const toggleCollectPlaylist = usePlayerStore((s) => s.toggleCollectPlaylist);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const openProfileModal = useAuthStore((s) => s.openProfileModal);

  const liked = useMemo(
    () => songs.filter((s) => s.isFavorite && s.title),
    [songs]
  );
  const downloaded = useMemo(
    () => songs.filter((s) => downloads.includes(s.id) && s.title),
    [songs, downloads]
  );
  const recent = useMemo(
    () => recentPlays
      .map((id) => songs.find((s) => s.id === id))
      .filter((s): s is Song => Boolean(s && s.title)),
    [recentPlays, songs]
  );

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = createPlaylist({ name: newName.trim() });
    setNewName("");
    setShowCreate(false);
    setSelectedPlaylist(id);
    setSelectedCurated(null);
  };

  const exitDetail = () => {
    setSelectedPlaylist(null);
    setSelectedCurated(null);
  };

  const handleTabChange = (t: MyTab) => {
    setTab(t);
    exitDetail();
    setDownloadSelectMode(false);
    setSelectedDownloads(new Set());
  };

  // 下载批量操作
  const toggleDownloadSelect = (id: number) => {
    setSelectedDownloads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (selectedDownloads.size === 0) return;
    removeDownloads(Array.from(selectedDownloads));
    setSelectedDownloads(new Set());
    setDownloadSelectMode(false);
  };

  const handleDeleteOneDownload = (id: number) => {
    removeDownloads([id]);
  };

  const renderList = (list: Song[], emptyText: string, actionLabel?: string, onAction?: () => void) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-16">
          <Music2 size={36} className="mx-auto text-faint mb-3" />
          <p className="font-dm text-sm text-soft mb-3">{emptyText}</p>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="clickable-pill px-5 py-2 rounded-full text-sm font-dm text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
            >
              {actionLabel}
            </button>
          )}
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

  return (
    <div className="space-y-6">
      {/* 头部：用户信息卡片 */}
      <div
        className="relative overflow-hidden rounded-card p-6 md:p-8 glass"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--card)) 0%, color-mix(in srgb, var(--accent-2) 6%, var(--card)) 100%)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "var(--accent)" }}
        />
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{
              background: user?.avatar
                ? undefined
                : "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent)",
            }}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-dm font-bold">
                {user ? user.nickname.slice(0, 1).toUpperCase() : <Headphones size={28} />}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-outfit font-bold text-2xl md:text-3xl text-primary truncate">
                {isLoggedIn && user ? user.nickname : "我的音乐"}
              </h1>
            </div>
            <p className="font-dm text-sm text-soft mt-1 truncate">
              {isLoggedIn && user
                ? (user.signature || `UID: ${user.uid}`)
                : "登录后即可同步收藏、歌单与播放记录"}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {isLoggedIn ? (
                <button
                  onClick={openProfileModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-dm text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    boxShadow: "0 2px 8px -2px var(--accent)",
                  }}
                >
                  <Edit3 size={12} /> 编辑资料
                </button>
              ) : (
                <button
                  onClick={() => openAuthModal("login")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-dm font-semibold text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    boxShadow: "0 4px 15px -3px var(--accent)",
                  }}
                >
                  <LogIn size={14} /> 登录 / 注册
                </button>
              )}
              <Link
                to="/"
                className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary"
                style={{ background: "var(--card-soft)", border: "1px solid var(--border-strong)" }}
              >
                ← 继续探索
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Stat icon={Heart} value={liked.length} color="var(--error)" fill />
          <Stat icon={Download} value={downloaded.length} color="var(--accent)" />
          <Stat icon={Clock} value={recent.length} color="var(--accent-2)" />
          <Stat icon={ListMusic} value={playlists.length} color="var(--success)" />
          <Stat icon={Star} value={collectedPlaylists.length} color="var(--warning)" />
        </div>
      </div>

      {/* 标签栏 */}
      <div className="card-surface p-1.5">
        <div className="flex items-center gap-1 p-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className="clickable-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-dm whitespace-nowrap transition-all duration-200"
                style={
                  active
                    ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "white" }
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

      {/* 内容区 */}
      <div className="card-surface p-2 md:p-4">
        {tab === "playlists" &&
          (selectedPlaylist || selectedCurated ? (
            <PlaylistDetail
              playlistId={selectedPlaylist}
              curatedId={selectedCurated}
              onBack={exitDetail}
              onRemoveSong={(songId) =>
                selectedPlaylist && removeSongFromPlaylist(selectedPlaylist, songId)
              }
            />
          ) : (
            <PlaylistSection
              playlists={playlists}
              collectedIds={collectedPlaylists}
              onSelect={(id) => {
                // 跳转到独立详情页以获得完整管理能力（编辑/拖拽/收藏/批量）
                navigate(`/my/playlist/${id}`);
              }}
              onSelectCurated={(id) => {
                setSelectedCurated(id);
                setSelectedPlaylist(null);
              }}
              onDelete={(id) => deletePlaylist(id)}
              onToggleCollect={(id) => toggleCollectPlaylist(id)}
              onCreate={() => setShowCreate(true)}
              showCreate={showCreate}
              newName={newName}
              setNewName={setNewName}
              onSubmitCreate={handleCreate}
              onCancelCreate={() => {
                setShowCreate(false);
                setNewName("");
              }}
            />
          ))}

        {tab === "liked" && renderList(liked, "还没有喜欢的歌曲，去首页发现一下吧", "去发现音乐", () => navigate("/"))}

        {tab === "recent" && (
          <>
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="font-dm text-xs text-soft">
                最近播放 · 共 {recent.length} 首 · 最多保留 100 条
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

        {tab === "downloads" && (
          <DownloadsSection
            downloaded={downloaded}
            selectMode={downloadSelectMode}
            setSelectMode={setDownloadSelectMode}
            selected={selectedDownloads}
            onToggleSelect={toggleDownloadSelect}
            onBatchDelete={handleBatchDelete}
            onClearSelection={() => setSelectedDownloads(new Set())}
            onDeleteOne={handleDeleteOneDownload}
          />
        )}
      </div>

      {/* 模块 4 - 创建歌单弹窗（替代内联输入框） */}
      <CreatePlaylistModal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setNewName("");
        }}
        onCreated={(id) => {
          // 创建完成后跳转到详情页
          navigate(`/my/playlist/${id}`);
        }}
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  color,
  fill,
}: {
  icon: typeof Heart;
  value: number;
  color: string;
  fill?: boolean;
}) {
  return (
    <span
      className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary inline-flex items-center gap-1.5"
      style={{ background: "var(--card-soft)", border: "1px solid var(--border-strong)" }}
    >
      <Icon size={12} style={{ color }} fill={fill ? "currentColor" : "none"} /> {value}
    </span>
  );
}

function PlaylistSection({
  playlists,
  collectedIds,
  onSelect,
  onSelectCurated,
  onDelete,
  onToggleCollect,
  onCreate,
  showCreate,
  newName,
  setNewName,
  onSubmitCreate,
  onCancelCreate,
}: {
  playlists: { id: string; name: string; songIds: number[]; cover?: string; createdAt: number }[];
  collectedIds: string[];
  onSelect: (id: string) => void;
  onSelectCurated: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollect: (id: string) => void;
  onCreate: () => void;
  showCreate: boolean;
  newName: string;
  setNewName: (s: string) => void;
  onSubmitCreate: () => void;
  onCancelCreate: () => void;
}) {
  return (
    <div>
      {/* 我创建的歌单 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="font-outfit text-title-sm text-primary">我创建的歌单</h3>
          <button
            onClick={onCreate}
            className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary"
            style={{ background: "var(--card-soft)" }}
          >
            <Plus size={12} className="inline mr-1" /> 新建
          </button>
        </div>

        {showCreate && (
          <div
            className="mb-3 flex gap-2 p-3 rounded-2xl"
            style={{ background: "var(--card-soft)" }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmitCreate();
                if (e.key === "Escape") onCancelCreate();
              }}
              placeholder="新歌单名称（1-30 字）"
              maxLength={30}
              className="flex-1 bg-transparent text-primary text-sm rounded-lg px-3 py-2 outline-none border border-default focus:border-accent"
              autoFocus
            />
            <button
              onClick={onSubmitCreate}
              className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-white"
              style={{ background: "var(--accent)" }}
            >
              创建
            </button>
            <button
              onClick={onCancelCreate}
              className="clickable-pill px-3 py-2 rounded-full text-sm font-dm text-soft"
            >
              取消
            </button>
          </div>
        )}

        {playlists.length === 0 ? (
          <div className="text-center py-12">
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
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {playlists.map((pl) => (
              <PlaylistCard
                key={pl.id}
                name={pl.name}
                subtitle={`${pl.songIds.length} 首歌曲`}
                cover={pl.cover}
                onSelect={() => onSelect(pl.id)}
                onDelete={() => onDelete(pl.id)}
                showDelete
              />
            ))}
          </div>
        )}
      </div>

      {/* 收藏的歌单 */}
      <div>
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="font-outfit text-title-sm text-primary">收藏的歌单</h3>
          <span className="font-dm text-xs text-soft">共 {collectedIds.length} 个</span>
        </div>
        {collectedIds.length === 0 ? (
          <div className="text-center py-12">
            <ListMusic size={36} className="mx-auto text-faint mb-3" />
            <p className="font-dm text-sm text-soft mb-3">还没有收藏的歌单</p>
            <p className="font-dm text-xs text-faint mb-4">在下方推荐歌单中点击 ★ 即可收藏</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {collectedIds.map((id) => {
              const cp = CURATED_PLAYLISTS.find((c) => c.id === id);
              const userPl = playlists.find((p) => p.id === id);
              if (!cp && !userPl) return null;
              if (userPl && !cp) {
                return (
                  <PlaylistCard
                    key={userPl.id}
                    name={userPl.name}
                    subtitle={`${userPl.songIds.length} 首歌曲`}
                    cover={userPl.cover}
                    onSelect={() => onSelect(userPl.id)}
                    onDelete={() => onDelete(userPl.id)}
                    showDelete
                  />
                );
              }
              return (
                <PlaylistCard
                  key={cp.id}
                  name={cp.name}
                  subtitle={`${cp.songCount} 首 · ${cp.description}`}
                  cover={cp.cover}
                  accent={cp.accent}
                  onSelect={() => onSelectCurated(cp.id)}
                  onToggleCollect={() => onToggleCollect(cp.id)}
                  collected
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 推荐歌单（可收藏） */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="font-outfit text-title-sm text-primary">推荐歌单</h3>
          <span className="font-dm text-xs text-soft">点击 ★ 收藏</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CURATED_PLAYLISTS.map((cp) => {
            const collected = collectedIds.includes(cp.id);
            return (
              <PlaylistCard
                key={cp.id}
                name={cp.name}
                subtitle={`${cp.songCount} 首 · ${cp.description}`}
                cover={cp.cover}
                accent={cp.accent}
                onSelect={() => onSelectCurated(cp.id)}
                onToggleCollect={() => onToggleCollect(cp.id)}
                collected={collected}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlaylistCard({
  name,
  subtitle,
  cover,
  accent,
  onSelect,
  onDelete,
  onToggleCollect,
  collected,
  showDelete,
}: {
  name: string;
  subtitle: string;
  cover?: string;
  accent?: string;
  onSelect: () => void;
  onDelete?: () => void;
  onToggleCollect?: () => void;
  collected?: boolean;
  showDelete?: boolean;
}) {
  return (
    <div className="relative clickable-ring" style={{ borderRadius: "1rem" }}>
      <button
        onClick={onSelect}
        className="w-full text-left p-3 rounded-2xl transition-all duration-200"
        style={{
          background: "var(--card-soft)",
          border: "1px solid var(--border)",
        }}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-full aspect-square rounded-lg object-cover mb-2"
            style={accent ? { boxShadow: `0 4px 16px -4px ${accent}55` } : undefined}
          />
        ) : (
          <div
            className="w-full aspect-square rounded-lg flex items-center justify-center mb-2"
            style={{
              background: `linear-gradient(135deg, var(--accent), var(--accent-2))`,
            }}
          >
            <ListMusic size={28} className="text-white" />
          </div>
        )}
        <h3 className="font-outfit font-semibold text-sm text-primary truncate">
          {name}
        </h3>
        <p className="font-dm text-xs text-soft mt-1 truncate">{subtitle}</p>
      </button>
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 song-row-action"
          title="删除歌单"
          aria-label="删除歌单"
          style={{ width: "24px", height: "24px" }}
        >
          <Trash2 size={12} />
        </button>
      )}
      {onToggleCollect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollect();
          }}
          className="absolute top-2 right-2 song-row-action"
          title={collected ? "取消收藏" : "收藏"}
          aria-label={collected ? "取消收藏" : "收藏"}
          style={{
            width: "28px",
            height: "28px",
            ...(collected ? { color: "var(--warning)", boxShadow: "0 0 0 1.5px var(--warning)" } : {}),
          }}
        >
          <Star size={12} fill={collected ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}

function PlaylistDetail({
  playlistId,
  curatedId,
  onBack,
  onRemoveSong,
}: {
  playlistId: string | null;
  curatedId: string | null;
  onBack: () => void;
  onRemoveSong: (songId: number) => void;
}) {
  const playlists = usePlayerStore((s) => s.playlists);
  const songs = usePlayerStore((s) => s.songs);
  const toggleCollectPlaylist = usePlayerStore((s) => s.toggleCollectPlaylist);
  const collectedIds = usePlayerStore((s) => s.collectedPlaylists);

  if (curatedId) {
    const cp: CuratedPlaylist | undefined = CURATED_PLAYLISTS.find((c) => c.id === curatedId);
    if (!cp) {
      return (
        <div className="text-center py-12">
          <p className="font-dm text-sm text-soft">歌单不存在</p>
          <button onClick={onBack} className="clickable-pill mt-3 px-3 py-1.5 rounded-full text-xs font-dm text-primary" style={{ background: "var(--card-soft)" }}>
            返回
          </button>
        </div>
      );
    }
    const collected = collectedIds.includes(cp.id);
    return (
      <div>
        <div className="flex items-center justify-between mb-4 px-2">
          <button onClick={onBack} className="font-dm text-xs text-soft hover:text-primary transition-colors clickable-pill px-3 py-1.5 flex items-center gap-1">
            <ChevronLeft size={12} /> 返回
          </button>
          <button
            onClick={() => toggleCollectPlaylist(cp.id)}
            className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary flex items-center gap-1.5"
            style={{
              background: collected
                ? "color-mix(in srgb, var(--warning) 14%, transparent)"
                : "var(--card-soft)",
            }}
          >
            <Star size={12} fill={collected ? "currentColor" : "none"} style={{ color: collected ? "var(--warning)" : undefined }} />
            {collected ? "已收藏" : "收藏"}
          </button>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-2xl mb-4" style={{ background: "var(--card-soft)" }}>
          {cp.cover ? (
            <img src={cp.cover} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-2))` }}>
              <ListMusic size={28} className="text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-outfit font-bold text-lg text-primary truncate">{cp.name}</h3>
            <p className="font-dm text-xs text-soft mt-1">{cp.description}</p>
            <p className="font-dm text-xs text-faint mt-2">{cp.songCount} 首歌曲 · 编辑精选</p>
          </div>
        </div>
        <div className="text-center py-12">
          <Music2 size={36} className="mx-auto text-faint mb-3" />
          <p className="font-dm text-sm text-soft">这是推荐歌单</p>
          <p className="font-dm text-xs text-faint mt-1">
            收藏后可在「收藏的歌单」中查看
          </p>
        </div>
      </div>
    );
  }

  const playlist = playlistId ? playlists.find((p) => p.id === playlistId) : undefined;
  if (!playlist) {
    return (
      <div className="text-center py-12">
        <p className="font-dm text-sm text-soft">歌单不存在</p>
        <button onClick={onBack} className="clickable-pill mt-3 px-3 py-1.5 rounded-full text-xs font-dm text-primary" style={{ background: "var(--card-soft)" }}>
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
        <button onClick={onBack} className="font-dm text-xs text-soft hover:text-primary transition-colors clickable-pill px-3 py-1.5 flex items-center gap-1">
          <ChevronLeft size={12} /> 返回
        </button>
        <h3 className="font-outfit font-semibold text-lg text-primary truncate flex-1 mx-3 text-center">
          {playlist.name}
        </h3>
        <span className="font-dm text-xs text-soft">{list.length} 首</span>
      </div>
      {list.length > 0 && <BatchActions songs={list} />}
      {list.length === 0 ? (
        <div className="text-center py-12">
          <Music2 size={36} className="mx-auto text-faint mb-3" />
          <p className="font-dm text-sm text-soft">这个歌单还是空的</p>
          <p className="font-dm text-xs text-faint mt-1">
            在歌曲右侧点击 ★ 即可加入此歌单
          </p>
        </div>
      ) : (
        <div className="space-y-1 mt-2">
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

function DownloadsSection({
  downloaded,
  selectMode,
  setSelectMode,
  selected,
  onToggleSelect,
  onBatchDelete,
  onClearSelection,
  onDeleteOne,
}: {
  downloaded: Song[];
  selectMode: boolean;
  setSelectMode: (v: boolean) => void;
  selected: Set<number>;
  onToggleSelect: (id: number) => void;
  onBatchDelete: () => void;
  onClearSelection: () => void;
  onDeleteOne: (id: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-2 gap-2 flex-wrap">
        <p className="font-dm text-xs text-soft">
          共 {downloaded.length} 首已下载 · 列表存于本地（PRD 3.5.4）
        </p>
        {downloaded.length > 0 && (
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <span className="font-dm text-xs text-soft">
                  已选 {selected.size} 首
                </span>
                <button
                  onClick={onBatchDelete}
                  disabled={selected.size === 0}
                  className="text-xs font-dm px-3 py-1.5 rounded-full flex items-center gap-1 clickable-pill"
                  style={
                    selected.size === 0
                      ? { background: "var(--card-soft)", color: "var(--text-faint)", cursor: "not-allowed" }
                      : { background: "var(--error)", color: "white" }
                  }
                >
                  <Trash2 size={12} /> 删除所选
                </button>
                <button
                  onClick={() => {
                    setSelectMode(false);
                    onClearSelection();
                  }}
                  className="text-xs font-dm px-3 py-1.5 rounded-full text-soft clickable-pill"
                  style={{ background: "var(--card-soft)" }}
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectMode(true)}
                  className="text-xs font-dm px-3 py-1.5 rounded-full text-primary clickable-pill flex items-center gap-1"
                  style={{ background: "var(--card-soft)" }}
                >
                  <CheckSquare size={12} /> 批量操作
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {downloaded.length === 0 ? (
        <div className="text-center py-16">
          <Download size={36} className="mx-auto text-faint mb-3" />
          <p className="font-dm text-sm text-soft">暂无下载歌曲</p>
          <p className="font-dm text-xs text-faint mt-1">
            在歌曲列表点击 ⬇ 即可下载到本地
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {downloaded.map((song, i) => (
            <DownloadRow
              key={song.id}
              song={song}
              index={i}
              selectMode={selectMode}
              selected={selected.has(song.id)}
              onToggleSelect={() => onToggleSelect(song.id)}
              onDelete={() => onDeleteOne(song.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DownloadRow({
  song,
  index,
  selectMode,
  selected,
  onToggleSelect,
  onDelete,
}: {
  song: Song;
  index: number;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group relative flex items-center gap-2 px-sp-sm py-sp-sm rounded-btn-icon text-left transition-all duration-200 ${
        selected ? "song-row-active" : "hover:bg-card-soft"
      }`}
    >
      {selectMode ? (
        <button
          onClick={onToggleSelect}
          className="w-6 h-6 flex items-center justify-center flex-shrink-0"
          aria-label={selected ? "取消选择" : "选择"}
        >
          {selected ? (
            <CheckSquare size={18} style={{ color: "var(--accent)" }} />
          ) : (
            <Square size={18} className="text-faint" />
          )}
        </button>
      ) : (
        <span className="w-6 text-center flex-shrink-0 font-dm text-mono text-faint">
          {index + 1}
        </span>
      )}

      {song.cover ? (
        <img src={song.cover} alt="" className="w-10 h-10 rounded-cover object-cover flex-shrink-0" />
      ) : (
        <div
          className="w-10 h-10 rounded-cover flex-shrink-0 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <span className="text-white/60 text-sm">♪</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-outfit text-body font-semibold text-primary truncate">
          {song.title}
        </p>
        <p className="font-dm text-caption text-soft truncate">{song.artist}</p>
      </div>

      {!selectMode && (
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onDelete}
            className="song-row-action"
            title="删除下载"
            aria-label="删除下载"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {!selectMode && (
        <span
          className="absolute top-1.5 right-1.5 text-[10px] font-dm px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
          style={{
            background: "color-mix(in srgb, var(--success) 16%, transparent)",
            color: "var(--success)",
          }}
        >
          <Download size={9} /> 已下载
        </span>
      )}
    </div>
  );
}
