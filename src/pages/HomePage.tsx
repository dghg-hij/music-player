import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Flame,
  Search,
  CalendarDays,
  Sparkles,
  Trophy,
  Mic2,
  ListMusic,
  ChevronRight,
  Loader2,
  PlayCircle,
  Clock,
} from "lucide-react";
import { RANKINGS } from "../data/songs";
import usePlayerStore from "../store/playerStore";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import RecommendSection from "../components/RecommendSection";
import { getChartSongs } from "../services/musicApi";
import { useEffect, useRef, useState } from "react";
import type { Song } from "../types";

interface QuickAccessItem {
  id: string;
  name: string;
  icon: typeof CalendarDays;
  color: string;
  /** 内部锚点（#xxx）或路由路径 */
  target: string;
}

const QUICK_ACCESS: QuickAccessItem[] = [
  { id: "daily30", name: "每日30首", icon: CalendarDays, color: "#F97316", target: "/recommend" },
  { id: "guess", name: "猜你喜欢", icon: Sparkles, color: "#A855F7", target: "/recommend" },
  { id: "ranking", name: "排行榜", icon: Trophy, color: "#EF4444", target: "/ranking/hot" },
  { id: "artists", name: "热门歌手", icon: Mic2, color: "#0EA5E9", target: "/hot-artists" },
  { id: "playlist", name: "歌单广场", icon: ListMusic, color: "#22C55E", target: "/playlist-square" },
  { id: "hot", name: "热门推荐", icon: Flame, color: "#F59E0B", target: "#hot-recommend" },
];

function QuickAccessBar({
  onPick,
}: {
  onPick: (item: QuickAccessItem) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {QUICK_ACCESS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onPick(item)}
              className="clickable-pill flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl min-w-[78px] transition-transform active:scale-95"
              style={{
                background: `color-mix(in srgb, ${item.color} 12%, var(--card))`,
                border: `1px solid color-mix(in srgb, ${item.color} 28%, var(--border))`,
              }}
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${item.color} 22%, transparent)`,
                }}
              >
                <Icon size={18} style={{ color: item.color }} />
              </span>
              <span className="font-dm text-xs text-primary whitespace-nowrap">
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RankingsSection() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>(RANKINGS[0]?.id ?? "hot");
  const [previewSongs, setPreviewSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  const active = RANKINGS.find((r) => r.id === activeId) ?? RANKINGS[0];

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setPreviewSongs([]);
    (async () => {
      try {
        const results = await getChartSongs(active.playlistId, 3, active.query);
        if (cancelled) return;
        const list: Song[] = results.slice(0, 3).map((r, i) => ({
          id: 7000 + i + active.id.charCodeAt(0) * 100,
          title: r.name,
          artist: r.artists,
          cover: r.picUrl || "",
          src: "",
          duration: r.duration ? r.duration / 1000 : 0,
          neteaseId: r.id,
          isLoading: false,
          isFavorite: false,
          heat: 100000 - i * 4000,
        }));
        setPreviewSongs(list);
      } catch {
        if (!cancelled) setPreviewSongs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy size={20} style={{ color: "var(--accent-2)" }} className="flex-shrink-0" />
          <h2 className="font-outfit font-bold text-2xl text-primary">
            各类排行榜
          </h2>
          <span
            className="font-dm text-[10px] text-soft flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: "var(--card-soft)",
              border: "1px solid var(--border)",
            }}
          >
            <Clock size={10} /> 一周更新一次
          </span>
        </div>
      </div>

      {/* 上方：切换榜单 */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-3"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {RANKINGS.map((r) => {
          const isActive = r.id === activeId;
          return (
            <button
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className="clickable-pill flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-dm transition-all whitespace-nowrap"
              style={
                isActive
                  ? {
                      background: `linear-gradient(135deg, ${r.accent}, var(--accent-2))`,
                      color: "white",
                      boxShadow: `0 2px 10px -2px ${r.accent}80`,
                    }
                  : {
                      background: "var(--card-soft)",
                      color: "var(--text-soft)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              {r.name}
            </button>
          );
        })}
      </div>

      {/* 中间：显示三首歌，点击歌曲即可互动 */}
      <div
        className="card-surface p-3 md:p-4 mb-3"
        style={{
          background: active
            ? `linear-gradient(135deg, color-mix(in srgb, ${active.accent} 8%, var(--card)) 0%, var(--card) 70%)`
            : "var(--card)",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: active?.accent ?? "var(--accent)" }}
            />
            <p className="font-dm text-xs text-soft">正在拉取榜单...</p>
          </div>
        ) : previewSongs.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-dm text-xs text-soft">该榜单暂无预览数据</p>
          </div>
        ) : (
          <div className="space-y-1">
            {previewSongs.map((song, i) => (
              <SongRow key={song.id} song={song} rank={i} showRank />
            ))}
          </div>
        )}
      </div>

      {/* 下方：完整榜单按钮，点击跳转完整榜单 */}
      {active && (
        <button
          onClick={() => navigate(`/ranking/${active.id}`)}
          className="clickable-pill w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-dm text-white"
          style={{
            background: `linear-gradient(135deg, ${active.accent}, var(--accent-2))`,
            boxShadow: `0 4px 14px -4px ${active.accent}80`,
          }}
        >
          <PlayCircle size={14} /> 完整榜单
          <ChevronRight size={14} />
        </button>
      )}
    </section>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const hotSongs = usePlayerStore((s) => s.hotSongs);
  const isLoadingHot = usePlayerStore((s) => s.isLoadingHot);
  const fetchHotSongs = usePlayerStore((s) => s.fetchHotSongs);

  // 快捷入口按钮处理：锚点 → 平滑滚动；路由 → 跳转
  const handleQuickAccess = (item: QuickAccessItem) => {
    if (item.target.startsWith("#")) {
      const id = item.target.slice(1);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    navigate(item.target);
  };

  // 路由 hash 变化时滚动到对应锚点（处理刷新 / 直接访问带 hash 的情况）
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      // 等一帧让页面渲染完毕
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.hash]);

  return (
    <div className="space-y-10">
      {/* 搜索框 - 圆角卡片式布局 */}
      <div
        className="flex items-center gap-2 rounded-card px-4 py-3 glass-subtle"
      >
        <Search size={18} className="text-faint flex-shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim()) {
              navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            }
          }}
          placeholder="搜索歌手或歌曲..."
          className="flex-1 bg-transparent text-body text-primary outline-none placeholder:text-faint font-dm"
        />
        <button
          onClick={() => {
            if (searchQuery.trim()) {
              navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            }
          }}
          className="px-3 py-1.5 rounded-btn-pill text-caption font-dm text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          搜索
        </button>
      </div>

      <section
        className="relative overflow-hidden rounded-card p-8 md:p-10 glass"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--card)) 0%, color-mix(in srgb, var(--accent-2) 6%, var(--card)) 100%)",
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "var(--accent-2)" }}
        />
        <div className="relative">
          <p className="font-dm text-xs text-soft mb-2 flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            今日推荐 · 听见好时光
          </p>
          <h1 className="font-outfit font-bold text-3xl md:text-4xl text-primary leading-tight">
            探索属于你的
            <span
              className="ml-2"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-2))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              心动旋律
            </span>
          </h1>
          <p className="font-dm text-sm text-soft mt-3 max-w-xl">
            从古风雅韵到流行前沿，从民谣心声到电子律动，分类、排行、收藏、下载，一切尽在指尖。
          </p>
          <div className="flex gap-2 mt-5">
            <Link
              to="/library"
              className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-white"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              }}
            >
              探索全部曲库
            </Link>
          </div>
        </div>
      </section>

      {/* 快捷入口 - 水平滚动的按钮 */}
      <QuickAccessBar onPick={handleQuickAccess} />

      {/* 各类排行榜 - 上方切换榜单 / 中间显示三首歌 / 下方显示完整榜单按钮 */}
      <RankingsSection />

      <RecommendSection />

      <section id="hot-recommend">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-outfit font-bold text-2xl text-primary">
            热门推荐
          </h2>
          <button
            onClick={() => fetchHotSongs(true)}
            className="font-dm text-xs text-soft hover:text-primary transition-colors clickable-pill px-3 py-1.5"
          >
            刷新
          </button>
        </div>
        <div className="card-surface p-2 md:p-4">
          {!isLoadingHot && hotSongs.length > 0 && <div className="mb-3"><BatchActions songs={hotSongs.slice(0, 10)} /></div>}
          {isLoadingHot && hotSongs.length === 0 ? (
            <div className="text-center py-12">
              <Flame
                size={36}
                className="mx-auto text-faint mb-3 animate-pulse"
                style={{ color: "var(--accent-2)" }}
              />
              <p className="font-dm text-sm text-soft">正在为你加载热门歌曲...</p>
            </div>
          ) : hotSongs.length === 0 ? (
            <div className="text-center py-12">
              <Flame
                size={36}
                className="mx-auto text-faint mb-3"
                style={{ color: "var(--accent-2)" }}
              />
              <p className="font-dm text-sm text-soft mb-3">热门歌曲加载失败</p>
              <button
                onClick={() => fetchHotSongs()}
                className="px-4 py-2 rounded-full text-sm font-dm text-white"
                style={{ background: "var(--accent)" }}
              >
                重新加载
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {hotSongs.slice(0, 10).map((song, i) => (
                <SongRow key={song.id} song={song} rank={i} showRank />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
