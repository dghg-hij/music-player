import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronRight,
  Headphones,
  Settings as SettingsIcon,
  Sun,
  Moon,
  MonitorSmartphone,
  LogOut,
  Play,
  Pause,
  ListOrdered,
} from "lucide-react";
import usePlayerStore from "../store/playerStore";
import useAuthStore from "../store/authStore";
import { audioControls } from "../hooks/useAudioPlayer";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import CreatePlaylistModal from "../components/CreatePlaylistModal";
import { CURATED_PLAYLISTS, type CuratedPlaylist } from "../data/songs";
import type { Song } from "../types";

type MyTab = "playlists" | "collected" | "liked" | "recent" | "downloads";

const TAB_TITLES: Record<MyTab, string> = {
  playlists: "我的歌单",
  collected: "收藏的歌单",
  liked: "我喜欢的",
  recent: "最近播放",
  downloads: "下载管理",
};

export default function MyPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<MyTab | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [selectedCurated, setSelectedCurated] = useState<string | null>(null);
  const [downloadSelectMode, setDownloadSelectMode] = useState(false);
  const [selectedDownloads, setSelectedDownloads] = useState<Set<number>>(new Set());

  const songs = usePlayerStore((s) => s.songs);
  const downloads = usePlayerStore((s) => s.downloads);
  const recentPlays = usePlayerStore((s) => s.recentPlays);
  const playlists = usePlayerStore((s) => s.playlists);
  const collectedPlaylists = usePlayerStore((s) => s.collectedPlaylists);
  const queue = usePlayerStore((s) => s.queue);
  const playFromQueue = usePlayerStore((s) => s.playFromQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const clearRecent = usePlayerStore((s) => s.clearRecent);
  const deletePlaylist = usePlayerStore((s) => s.deletePlaylist);
  const removeSongFromPlaylist = usePlayerStore((s) => s.removeSongFromPlaylist);
  const removeDownloads = usePlayerStore((s) => s.removeDownloads);
  const toggleCollectPlaylist = usePlayerStore((s) => s.toggleCollectPlaylist);

  const themeMode = usePlayerStore((s) => s.themeMode);
  const setThemeMode = usePlayerStore((s) => s.setThemeMode);
  const showToast = usePlayerStore((s) => s.showToast);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
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

  const exitDetail = () => {
    setSelectedPlaylist(null);
    setSelectedCurated(null);
  };

  const handleTabChange = (t: MyTab) => {
    setTab(tab === t ? null : t);
    exitDetail();
    setDownloadSelectMode(false);
    setSelectedDownloads(new Set());
  };

  const handleBackToMenu = () => {
    setTab(null);
    exitDetail();
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

  const handleLogout = () => {
    logout();
    showToast("已退出登录", "success");
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

  // ---- 子页面：内容区（按 tab 切换） ----
  if (tab) {
    return (
      <div className="space-y-4">
        {/* 顶部导航：返回 + 标题 */}
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={handleBackToMenu}
            className="clickable-pill flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-dm text-soft hover:text-primary transition-colors"
            style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
            aria-label="返回个人中心"
          >
            <ChevronLeft size={14} /> 返回
          </button>
          <h2 className="font-outfit font-semibold text-lg text-primary ml-1">
            {TAB_TITLES[tab]}
          </h2>
        </div>

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
                onSelect={(id) => navigate(`/my/playlist/${id}`)}
                onSelectCurated={(id) => {
                  setSelectedCurated(id);
                  setSelectedPlaylist(null);
                }}
                onDelete={(id) => deletePlaylist(id)}
                onCreate={() => setShowCreate(true)}
              />
            ))}

          {tab === "collected" && (
            <CollectedSection
              collectedIds={collectedPlaylists}
              onSelectCurated={(id) => {
                setSelectedCurated(id);
                setSelectedPlaylist(null);
              }}
              onToggleCollect={(id) => toggleCollectPlaylist(id)}
            />
          )}

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

        <CreatePlaylistModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            navigate(`/my/playlist/${id}`);
          }}
        />
      </div>
    );
  }

  // ---- 主页：菜单列表 ----
  return (
    <div className="space-y-4">
      {/* 用户信息卡片 */}
      <div
        className="relative overflow-hidden rounded-card p-5 md:p-6 glass"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--card)) 0%, color-mix(in srgb, var(--accent-2) 6%, var(--card)) 100%)",
        }}
      >
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "var(--accent)" }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{
              background: user?.avatar
                ? undefined
                : "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)",
            }}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xl font-dm font-bold">
                {user ? user.nickname.slice(0, 1).toUpperCase() : <Headphones size={24} />}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-outfit font-bold text-xl md:text-2xl text-primary truncate">
              {isLoggedIn && user ? user.nickname : "个人中心"}
            </h1>
            <p className="font-dm text-xs text-soft mt-0.5 truncate">
              {isLoggedIn && user
                ? (user.signature || `UID: ${user.uid}`)
                : "登录后即可同步收藏、歌单与播放记录"}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {isLoggedIn ? (
                <button
                  onClick={openProfileModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-dm text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    boxShadow: "0 2px 8px -2px var(--accent)",
                  }}
                >
                  <Edit3 size={10} /> 编辑资料
                </button>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-dm font-semibold text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    boxShadow: "0 2px 10px -2px var(--accent)",
                  }}
                >
                  <LogIn size={12} /> 登录 / 注册
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 快捷统计 */}
      <div className="card-surface p-3 md:p-4">
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          <StatTile icon={Heart} value={liked.length} label="我喜欢的" active={tab === "liked"} onClick={() => handleTabChange("liked")} color="var(--error)" fill />
          <StatTile icon={ListMusic} value={playlists.length} label="我的歌单" active={tab === "playlists"} onClick={() => handleTabChange("playlists")} color="var(--success)" />
          <StatTile icon={Star} value={collectedPlaylists.length} label="收藏" active={tab === "collected"} onClick={() => handleTabChange("collected")} color="var(--warning)" />
          <StatTile icon={Clock} value={recent.length} label="历史" active={tab === "recent"} onClick={() => handleTabChange("recent")} color="var(--accent-2)" />
        </div>
        <button
          onClick={() => handleTabChange("downloads")}
          className={`mt-2 w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
            tab === "downloads" ? "" : "hover:bg-card-soft"
          }`}
          style={tab === "downloads" ? { background: "color-mix(in srgb, var(--accent) 10%, transparent)" } : undefined}
        >
          <Download size={16} style={{ color: "var(--accent)" }} />
          <span className="flex-1 text-left text-sm font-dm text-primary">下载管理</span>
          <span className="text-xs font-dm text-soft">{downloaded.length} 首</span>
          <ChevronRight size={14} className="text-faint" />
        </button>
      </div>

      {/* 功能列表：分行排布 */}
      <div className="space-y-3">
        {/* 主题切换 */}
        <div className="card-surface p-3 md:p-4">
          <p className="font-dm text-[11px] text-soft px-1 mb-2">主题外观</p>
          <div className="grid grid-cols-3 gap-2">
            <ThemeOption
              icon={Sun}
              label="日间"
              active={themeMode === "day"}
              onClick={() => {
                setThemeMode("day");
                showToast("已切换至日间模式", "success");
              }}
            />
            <ThemeOption
              icon={Moon}
              label="夜间"
              active={themeMode === "night"}
              onClick={() => {
                setThemeMode("night");
                showToast("已切换至夜间模式", "success");
              }}
            />
            <ThemeOption
              icon={MonitorSmartphone}
              label="跟随系统"
              active={false}
              onClick={() => {
                showToast("请在「设置中心」中选择跟随系统", "info");
                navigate("/settings");
              }}
            />
          </div>
        </div>

        {/* 设置中心 / 账号 */}
        <div className="card-surface divide-y divide-[var(--border)]">
          <MenuRow
            icon={SettingsIcon}
            label="设置中心"
            description="播放、界面、缓存、账号"
            onClick={() => navigate("/settings")}
          />
          {isLoggedIn ? (
            <MenuRow
              icon={LogOut}
              label="退出登录"
              description="清除本地登录状态"
              onClick={handleLogout}
              danger
            />
          ) : (
            <MenuRow
              icon={LogIn}
              label="登录账号"
              description="登录后可同步偏好、收藏与播放记录"
              onClick={() => navigate("/login")}
            />
          )}
        </div>

        <p className="text-center text-[11px] font-dm text-faint pt-2">
          聆音 · 愿每首旋律都温柔你的时光
        </p>
      </div>
    </div>
  );
}

/* ---------- 内部组件 ---------- */

function MenuRow({
  icon: Icon,
  label,
  description,
  onClick,
  danger,
}: {
  icon: typeof SettingsIcon;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 md:px-4 py-3.5 transition-colors hover:bg-card-soft active:scale-[0.99] text-left"
    >
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: danger
            ? "color-mix(in srgb, var(--error) 14%, transparent)"
            : "color-mix(in srgb, var(--accent) 14%, transparent)",
          color: danger ? "var(--error)" : "var(--accent)",
        }}
      >
        <Icon size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="font-dm text-sm font-semibold truncate"
          style={{ color: danger ? "var(--error)" : "var(--text)" }}
        >
          {label}
        </p>
        {description && (
          <p className="font-dm text-[11px] text-soft mt-0.5 truncate">{description}</p>
        )}
      </div>
      <ChevronRight size={16} className="text-faint flex-shrink-0" />
    </button>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
  color,
  fill,
  active,
  onClick,
}: {
  icon: typeof Heart;
  value: number;
  label: string;
  color: string;
  fill?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-2xl transition-all active:scale-95"
      style={{
        background: active
          ? "color-mix(in srgb, var(--accent) 14%, transparent)"
          : "transparent",
      }}
    >
      <span
        className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center"
        style={{
          background: "var(--card-soft)",
          boxShadow: active ? "0 0 0 1.5px var(--accent)" : undefined,
        }}
      >
        <Icon size={16} style={{ color }} fill={fill ? "currentColor" : "none"} />
      </span>
      <span className="font-outfit font-semibold text-sm text-primary leading-none">{value}</span>
      <span className="font-dm text-[10px] text-soft leading-none">{label}</span>
    </button>
  );
}

function ThemeOption({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Sun;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95"
      style={{
        background: active
          ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent-2) 14%, transparent))"
          : "var(--card-soft)",
        border: active
          ? "1.5px solid var(--accent)"
          : "1px solid var(--border)",
      }}
    >
      <Icon
        size={18}
        style={{ color: active ? "var(--accent)" : "var(--text-soft)" }}
      />
      <span
        className="font-dm text-xs font-medium"
        style={{ color: active ? "var(--accent)" : "var(--text-soft)" }}
      >
        {label}
      </span>
    </button>
  );
}

function PlaylistSection({
  playlists,
  onSelect,
  onSelectCurated,
  onDelete,
  onCreate,
}: {
  playlists: { id: string; name: string; songIds: number[]; cover?: string; createdAt: number }[];
  onSelect: (id: string) => void;
  onSelectCurated: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div>
      <div className="mb-4">
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

        {playlists.length === 0 ? (
          <div className="text-center py-10">
            <ListMusic size={32} className="mx-auto text-faint mb-2" />
            <p className="font-dm text-sm text-soft mb-3">还没有创建歌单</p>
            <button
              onClick={onCreate}
              className="clickable-pill px-4 py-2 rounded-full text-xs font-dm text-white"
              style={{ background: "var(--accent)" }}
            >
              <Plus size={12} className="inline mr-1" /> 新建歌单
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

      {/* 推荐歌单（可收藏） */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="font-outfit text-title-sm text-primary">推荐歌单</h3>
          <span className="font-dm text-xs text-soft">点击 ★ 收藏</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CURATED_PLAYLISTS.map((cp) => (
            <PlaylistCard
              key={cp.id}
              name={cp.name}
              subtitle={`${cp.songCount} 首 · ${cp.description}`}
              cover={cp.cover}
              accent={cp.accent}
              onSelect={() => onSelectCurated(cp.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CollectedSection({
  collectedIds,
  onSelectCurated,
  onToggleCollect,
}: {
  collectedIds: string[];
  onSelectCurated: (id: string) => void;
  onToggleCollect: (id: string) => void;
}) {
  if (collectedIds.length === 0) {
    return (
      <div className="text-center py-12">
        <Star size={36} className="mx-auto text-faint mb-3" />
        <p className="font-dm text-sm text-soft mb-2">还没有收藏的歌单</p>
        <p className="font-dm text-xs text-faint">在「我的歌单」中点击 ★ 即可收藏</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="font-outfit text-title-sm text-primary">收藏的歌单</h3>
        <span className="font-dm text-xs text-soft">共 {collectedIds.length} 个</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {collectedIds.map((id) => {
          const cp = CURATED_PLAYLISTS.find((c) => c.id === id);
          if (!cp) return null;
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
            <img src={cp.cover} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-2))` }}>
              <ListMusic size={28} className="text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-outfit font-bold text-base text-primary truncate">{cp.name}</h3>
            <p className="font-dm text-xs text-soft mt-1">{cp.description}</p>
            <p className="font-dm text-xs text-faint mt-1">{cp.songCount} 首歌曲 · 编辑精选</p>
          </div>
        </div>
        <div className="text-center py-10">
          <Music2 size={32} className="mx-auto text-faint mb-2" />
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
        <h3 className="font-outfit font-semibold text-base text-primary truncate flex-1 mx-3 text-center">
          {playlist.name}
        </h3>
        <span className="font-dm text-xs text-soft">{list.length} 首</span>
      </div>
      {list.length > 0 && <BatchActions songs={list} />}
      {list.length === 0 ? (
        <div className="text-center py-10">
          <Music2 size={32} className="mx-auto text-faint mb-2" />
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
          共 {downloaded.length} 首已下载 · 列表存于本地
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
              <button
                onClick={() => setSelectMode(true)}
                className="text-xs font-dm px-3 py-1.5 rounded-full text-primary clickable-pill flex items-center gap-1"
                style={{ background: "var(--card-soft)" }}
              >
                <CheckSquare size={12} /> 批量操作
              </button>
            )}
          </div>
        )}
      </div>

      {downloaded.length === 0 ? (
        <div className="text-center py-12">
          <Download size={32} className="mx-auto text-faint mb-3" />
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
  const navigate = useNavigate();
  const playSong = usePlayerStore((s) => s.playSong);
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isCurrent = usePlayerStore((s) => s.songs.findIndex((ss) => ss.id === song.id) === currentSongIndex);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      audioControls.togglePlay();
      return;
    }
    playSong(song);
    navigate("/play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={`group relative flex items-center gap-2 px-2 py-2 rounded-2xl text-left transition-all duration-200 ${
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
        <span className="w-6 text-center flex-shrink-0 font-dm text-[11px] text-faint">
          {index + 1}
        </span>
      )}

      {song.cover ? (
        <img src={song.cover} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <span className="text-white/60 text-sm">♪</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-outfit text-sm font-semibold text-primary truncate">
          {song.title}
        </p>
        <p className="font-dm text-xs text-soft truncate">{song.artist}</p>
      </div>

      {!selectMode && (
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto pl-1">
          <button
            onClick={handlePlay}
            className="song-row-action"
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
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="song-row-action opacity-0 group-hover:opacity-100"
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

function QueueSection({
  queue,
  onPlay,
  onRemove,
  onClear,
}: {
  queue: Song[];
  onPlay: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-2">
        <p className="font-dm text-xs text-soft">
          待播放 · 共 {queue.length} 首 · 播放完后会按列表顺序自动播放
        </p>
        {queue.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-soft hover:text-red-500 transition-colors flex items-center gap-1 clickable-pill px-2 py-1"
            aria-label="清空待播放"
            title="清空待播放"
          >
            <Trash2 size={12} /> 清空
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-12">
          <ListOrdered size={32} className="mx-auto text-faint mb-3" />
          <p className="font-dm text-sm text-soft">待播放列表为空</p>
          <p className="font-dm text-xs text-faint mt-1">
            在歌曲行点击 + 即可加入待播放
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {queue.map((song, i) => (
            <QueueRow
              key={song.id}
              song={song}
              index={i}
              onPlay={() => onPlay(song.id)}
              onRemove={() => onRemove(song.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueRow({
  song,
  index,
  onPlay,
  onRemove,
}: {
  song: Song;
  index: number;
  onPlay: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onPlay}
      className="group flex items-center gap-2 px-2 py-2 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-card-soft"
    >
      <span className="w-6 text-center flex-shrink-0 font-dm text-[11px] text-faint">
        {index + 1}
      </span>

      {song.cover ? (
        <img src={song.cover} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <Music2 size={16} className="text-white/60" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-outfit text-sm font-semibold text-primary truncate">
          {song.title}
        </p>
        <p className="font-dm text-xs text-soft truncate">{song.artist}</p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="song-row-action opacity-0 group-hover:opacity-100 flex-shrink-0"
        title="从待播放移除"
        aria-label="从待播放移除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
