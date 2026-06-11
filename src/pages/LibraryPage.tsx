import { Link, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import {
  Plus,
  Music2,
  Heart,
  ChevronRight,
  ListMusic,
  Search as SearchIcon,
  Loader2,
} from "lucide-react";
import usePlayerStore from "../store/playerStore";
import { CATEGORIES, RANKINGS } from "../data/songs";
import {
  getHotKeywords,
  getLibraryCategorySongs,
  type HotKeyword,
  type SearchResult,
} from "../services/musicApi";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";

export default function LibraryPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const songs = usePlayerStore((s) => s.songs);
  const showFavorites = usePlayerStore((s) => s.showFavorites);
  const toggleShowFavorites = usePlayerStore((s) => s.toggleShowFavorites);
  const importLocalFiles = usePlayerStore((s) => s.importLocalFiles);

  // 模块 3：乐库浏览 - 热门搜索 + 各分类预览 - PRD 3.3.3
  const [hotKeywords, setHotKeywords] = useState<HotKeyword[]>([]);
  const [previewByCategory, setPreviewByCategory] = useState<Record<string, SearchResult[]>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      importLocalFiles(e.target.files);
      e.target.value = "";
    }
  };

  const localSongs = songs.filter((s) => s.title);
  const displayList = showFavorites
    ? localSongs.filter((s) => s.isFavorite)
    : localSongs;

  // 加载热门搜索 + 各分类预览
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hk = await getHotKeywords();
      if (!cancelled) setHotKeywords(hk);

      setPreviewLoading(true);
      const previews: Record<string, SearchResult[]> = {};
      // 只预加载 4 个分类，避免一次请求过多
      const topCategories = CATEGORIES.slice(0, 4);
      await Promise.all(
        topCategories.map(async (c) => {
          try {
            const list = await getLibraryCategorySongs(c.id, 1, 6);
            previews[c.id] = list.slice(0, 6);
          } catch {
            previews[c.id] = [];
          }
        })
      );
      if (!cancelled) {
        setPreviewByCategory(previews);
        setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* 头部 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-outfit font-bold text-3xl text-primary">乐库</h1>
          <p className="font-dm text-sm text-soft mt-1">
            发现音乐 · 浏览分类 · 查看榜单
          </p>
        </div>
        <button
          onClick={() => navigate("/search")}
          className="clickable-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-dm text-primary"
          style={{
            background: "var(--card-soft)",
            border: "1px solid var(--border)",
          }}
        >
          <SearchIcon size={12} /> 搜索音乐
        </button>
      </div>

      {/* 音乐分类 - PRD 3.3.3 乐库浏览 */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="font-outfit font-bold text-2xl text-primary">音乐分类</h2>
            <p className="font-dm text-xs text-soft mt-1">
              点分类卡片 → 查看该分类下的歌曲
            </p>
          </div>
          <Link
            to="/ranking"
            className="font-dm text-xs text-soft hover:text-primary transition-colors flex items-center gap-1 clickable-pill px-3 py-1.5"
          >
            查看排行榜 <ChevronRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((c) => (
            <CategoryCardWithPreview
              key={c.id}
              id={c.id}
              name={c.name}
              description={c.description}
              cover={c.cover}
              accent={c.accent}
              preview={previewByCategory[c.id] || []}
              loading={previewLoading && !previewByCategory[c.id]}
            />
          ))}
        </div>
      </section>

      {/* 热门搜索 - PRD 3.3.1 / 3.3.3 */}
      {hotKeywords.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music2 size={18} style={{ color: "var(--accent-2)" }} />
              <h2 className="font-outfit font-bold text-2xl text-primary">热门搜索</h2>
            </div>
            <button
              onClick={() => navigate("/search")}
              className="font-dm text-xs text-soft hover:text-primary transition-colors flex items-center gap-1 clickable-pill px-3 py-1.5"
            >
              更多 <ChevronRight size={12} />
            </button>
          </div>
          <div className="card-surface p-4 flex flex-wrap gap-2">
            {hotKeywords.slice(0, 8).map((hk) => (
              <button
                key={hk.rank}
                onClick={() => navigate(`/search?q=${encodeURIComponent(hk.text)}`)}
                className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm flex items-center gap-1.5"
                style={{
                  background: hk.rank <= 3
                    ? "color-mix(in srgb, var(--accent-2) 12%, transparent)"
                    : "var(--card-soft)",
                  border: "1px solid var(--border)",
                  color: hk.rank <= 3 ? "var(--accent-2)" : "var(--text)",
                }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: hk.rank <= 3 ? "var(--accent-2)" : "var(--card)",
                    color: hk.rank <= 3 ? "white" : "var(--text-soft)",
                  }}
                >
                  {hk.rank}
                </span>
                {hk.text}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 排行榜入口 - PRD 3.3.3 */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListMusic size={18} style={{ color: "var(--accent)" }} />
            <h2 className="font-outfit font-bold text-2xl text-primary">排行榜</h2>
          </div>
          <Link
            to="/ranking"
            className="font-dm text-xs text-soft hover:text-primary transition-colors flex items-center gap-1 clickable-pill px-3 py-1.5"
          >
            查看全部 <ChevronRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {RANKINGS.map((r) => (
            <Link
              key={r.id}
              to={`/ranking/${r.id}`}
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
                  className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ boxShadow: `0 0 12px -2px ${r.accent}80` }}
                >
                  <img
                    src={r.cover}
                    alt={r.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = "none";
                      if (t.parentElement)
                        t.parentElement.style.background = `linear-gradient(135deg, ${r.accent}, var(--accent-2))`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-outfit font-semibold text-base text-primary">
                    {r.name}
                  </h3>
                  <p className="font-dm text-xs text-soft truncate">{r.description}</p>
                </div>
                <ChevronRight size={18} className="text-faint flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 本地音乐 - 我的曲库 */}
      <section>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="font-outfit font-bold text-2xl text-primary mr-2">我的曲库</h2>
          <button
            onClick={toggleShowFavorites}
            className="clickable-pill px-3 py-2 rounded-full text-xs font-dm flex items-center gap-1.5"
            style={
              showFavorites
                ? { background: "color-mix(in srgb, #ef4444 18%, transparent)", color: "#ef4444" }
                : { background: "var(--card-soft)", color: "var(--text-soft)" }
            }
            title={showFavorites ? "显示全部" : "只显示我喜欢"}
          >
            <Heart size={12} fill={showFavorites ? "currentColor" : "none"} />
            我喜欢
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="clickable-pill px-3 py-2 rounded-full text-xs font-dm flex items-center gap-1.5 text-white"
            style={{ background: "var(--accent)" }}
            title="导入本地音乐"
          >
            <Plus size={12} /> 导入本地
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="card-surface p-1.5 sm:p-3 md:p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="font-dm text-xs text-soft">
              {showFavorites
                ? `我喜欢 · ${displayList.length} 首`
                : `全部歌曲 · ${displayList.length} 首`}
            </p>
          </div>

          {displayList.length > 0 && <BatchActions songs={displayList} />}

          {displayList.length === 0 ? (
            <div className="text-center py-12">
              <Music2 size={36} className="mx-auto text-faint mb-3" />
              <p className="font-dm text-sm text-soft">
                {showFavorites ? "还没有喜欢的歌曲" : "曲库为空，试试导入本地音乐或去搜索"}
              </p>
              {!showFavorites && (
                <button
                  onClick={() => navigate("/search")}
                  className="mt-3 clickable-pill px-4 py-2 rounded-full text-xs font-dm text-white"
                  style={{ background: "var(--accent)" }}
                >
                  <SearchIcon size={12} className="inline mr-1" /> 去搜索音乐
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {displayList.map((song, i) => (
                <SongRow key={song.id} song={song} index={i} showPlaylistMenu />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CategoryCardWithPreview({
  id,
  name,
  description,
  cover,
  accent,
  preview,
  loading,
}: {
  id: string;
  name: string;
  description: string;
  cover: string;
  accent: string;
  preview: SearchResult[];
  loading: boolean;
}) {
  return (
    <Link
      to={`/category/${id}`}
      className="group block clickable-ring"
      style={{ borderRadius: "1.25rem" }}
    >
      <div
        className="relative rounded-2xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]"
        style={{ boxShadow: `0 6px 20px -4px ${accent}55` }}
      >
        <div className="aspect-square">
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
              background: `linear-gradient(180deg, transparent 30%, ${accent}cc 100%)`,
            }}
          />
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-dm font-semibold text-white"
               style={{ background: "rgba(0,0,0,0.4)" }}>
            {preview.length > 0 ? `${preview.length}+ 首` : "查看"}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-outfit font-bold text-xl text-white leading-tight">
              {name}
            </h3>
            <p className="font-dm text-xs text-white/85 mt-0.5 truncate">
              {description}
            </p>
          </div>
        </div>
        {/* 预览：底部 2 行曲名 */}
        <div
          className="px-3 py-2"
          style={{ background: `color-mix(in srgb, ${accent} 30%, var(--card))` }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-1">
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: accent }} />
            </div>
          ) : preview.length > 0 ? (
            <div className="space-y-0.5">
              {preview.slice(0, 2).map((p, i) => (
                <p
                  key={p.id}
                  className="font-dm text-[11px] text-white/95 truncate"
                  title={p.name}
                >
                  <span className="opacity-60 mr-1">{i + 1}.</span>
                  {p.name}
                </p>
              ))}
            </div>
          ) : (
            <p className="font-dm text-[11px] text-white/70">点击查看更多</p>
          )}
        </div>
      </div>
    </Link>
  );
}
