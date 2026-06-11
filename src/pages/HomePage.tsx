import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Flame, TrendingUp, Search, Play, Pause, Music2 } from "lucide-react";
import { CATEGORIES, RANKINGS } from "../data/songs";
import usePlayerStore from "../store/playerStore";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import RecommendSection from "../components/RecommendSection";
import { audioControls } from "../hooks/useAudioPlayer";
import { useState } from "react";

function CategoryCard({
  id,
  name,
  description,
  cover,
  accent,
}: {
  id: string;
  name: string;
  description: string;
  cover: string;
  accent: string;
}) {
  return (
    <Link
      to={`/category/${id}`}
      className="group block clickable-ring"
      style={{ borderRadius: "1.25rem" }}
    >
      <div
        className="relative aspect-square rounded-2xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]"
        style={{ boxShadow: `0 6px 20px -4px ${accent}55` }}
      >
        <img
          src={cover}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            if (t.parentElement)
              t.parentElement.style.background = `linear-gradient(135deg, ${accent}, var(--accent-2))`;
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 40%, ${accent}cc 100%)`,
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-outfit font-bold text-xl text-white leading-tight">
            {name}
          </h3>
          <p className="font-dm text-xs text-white/85 mt-0.5 truncate">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function RankingCard({
  id,
  name,
  description,
  cover,
  accent,
  preview,
}: {
  id: string;
  name: string;
  description: string;
  cover: string;
  accent: string;
  preview: string[];
}) {
  return (
    <Link
      to={`/ranking/${id}`}
      className="group block clickable-ring"
      style={{ borderRadius: "1.25rem" }}
    >
      <div
        className="flex items-center gap-3 p-3 rounded-2xl transition-all duration-200"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
          style={{ boxShadow: `0 0 14px -2px ${accent}80` }}
        >
          <img
            src={cover}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.style.display = "none";
              if (t.parentElement)
                t.parentElement.style.background = `linear-gradient(135deg, ${accent}, var(--accent-2))`;
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.25)" }}
          >
            <Flame size={22} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-outfit font-semibold text-base text-primary">
            {name}
          </h3>
          <p className="font-dm text-xs text-soft truncate">{description}</p>
          <p className="font-dm text-[10px] text-faint mt-1 truncate">
            {preview.join(" · ")}
          </p>
        </div>
        <ChevronRight size={18} className="text-faint flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const songs = usePlayerStore((s) => s.songs);
  const hotSongs = usePlayerStore((s) => s.hotSongs);
  const isLoadingHot = usePlayerStore((s) => s.isLoadingHot);
  const fetchHotSongs = usePlayerStore((s) => s.fetchHotSongs);
  const currentSong = usePlayerStore((s) => s.songs[s.currentSongIndex]);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = audioControls.togglePlay;

  const previewFor = (ids: string[]) => {
    const list = songs
      .filter((s) => ids.some((k) => s.title.includes(k) || s.artist.includes(k)))
      .slice(0, 3)
      .map((s) => s.title);
    if (list.length > 0) return list;
    if (hotSongs.length > 0) return hotSongs.slice(0, 3).map((s) => s.title);
    return ["加载中..."];
  };

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

      {/* 正在播放 - 毛玻璃效果卡片 */}
      {currentSong && currentSong.title && (
        <div
          className="flex items-center gap-4 rounded-card p-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] glass"
          style={{
            boxShadow: isPlaying ? "0 4px 24px -4px color-mix(in srgb, var(--accent) 20%, transparent)" : "none",
          }}
          onClick={() => navigate("/play")}
        >
          <div
            className="w-14 h-14 rounded-btn-icon overflow-hidden flex-shrink-0"
            style={{ boxShadow: "0 0 16px -2px color-mix(in srgb, var(--accent) 30%, transparent)" }}
          >
            {currentSong.cover ? (
              <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
              >
                <Music2 size={20} className="text-white/70" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-dm text-mono text-soft flex items-center gap-1.5 mb-0.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--accent)" }}
              />
              正在播放
            </p>
            <p className="font-outfit text-body font-semibold text-primary truncate">{currentSong.title}</p>
            <p className="font-dm text-caption text-soft truncate">{currentSong.artist}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-transform active:scale-90"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 2px 12px -2px color-mix(in srgb, var(--accent) 30%, transparent)",
            }}
          >
            {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
          </button>
        </div>
      )}

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
            <Link
              to="/recommend"
              className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-primary"
              style={{
                background: "var(--card-soft)",
                border: "1px solid var(--border-strong)",
              }}
            >
              个性推荐
            </Link>
            <Link
              to="/ranking"
              className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-primary"
              style={{
                background: "var(--card-soft)",
                border: "1px solid var(--border-strong)",
              }}
            >
              查看排行榜
            </Link>
          </div>
        </div>
      </section>

      <RecommendSection />

      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-outfit font-bold text-2xl text-primary">
              音乐分类
            </h2>
            <p className="font-dm text-xs text-soft mt-1">
              点击分类卡片进入对应歌曲页面
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((c) => (
            <CategoryCard key={c.id} {...c} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} style={{ color: "var(--accent-2)" }} />
            <h2 className="font-outfit font-bold text-2xl text-primary">
              各类音乐排行榜
            </h2>
          </div>
          <Link
            to="/ranking"
            className="font-dm text-xs text-soft hover:text-primary transition-colors flex items-center gap-1 clickable-pill px-3 py-1.5"
          >
            查看全部 <ChevronRight size={12} />
          </Link>
        </div>
        <p className="font-dm text-xs text-faint mb-3">
          点击排行榜卡片查看完整排行 → 跳转到「我的」收藏
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {RANKINGS.map((r) => (
            <RankingCard
              key={r.id}
              id={r.id}
              name={r.name}
              description={r.description}
              cover={r.cover}
              accent={r.accent}
              preview={previewFor([r.query])}
            />
          ))}
        </div>
      </section>

      <section>
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
