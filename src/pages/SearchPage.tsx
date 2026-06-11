import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Music2,
  Clock,
  Search as SearchIcon,
  Flame,
  TrendingUp,
  Mic2,
  Disc3,
  ListMusic,
  X,
  Filter,
} from "lucide-react";
import {
  searchSongs,
  getHotKeywords,
  getSearchSuggestions,
  searchArtists,
  searchAlbums,
  searchPlaylists,
  filterAndSortSongs,
  GENRE_KEYWORDS,
  LANGUAGE_KEYWORDS,
  type SearchResult,
  type HotKeyword,
  type SearchSuggestion,
  type Artist,
  type Album,
  type PlaylistBrief,
} from "../services/musicApi";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import usePlayerStore from "../store/playerStore";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 15;
const PAGE_SIZE = 20;

type TabKey = "songs" | "artists" | "albums" | "playlists";

const TABS: { id: TabKey; label: string; icon: typeof Music2 }[] = [
  { id: "songs", label: "歌曲", icon: Music2 },
  { id: "artists", label: "歌手", icon: Mic2 },
  { id: "albums", label: "专辑", icon: Disc3 },
  { id: "playlists", label: "歌单", icon: ListMusic },
];

// 流派筛选选项 - PRD 3.3.2
const GENRE_OPTIONS = [
  { id: "pop", label: "流行" },
  { id: "rock", label: "摇滚" },
  { id: "classical", label: "古典" },
  { id: "electronic", label: "电子" },
  { id: "hiphop", label: "说唱" },
  { id: "rnb", label: "R&B" },
];

// 语种筛选选项 - PRD 3.3.2
const LANGUAGE_OPTIONS = [
  { id: "zh", label: "中文" },
  { id: "en", label: "英语" },
  { id: "ja", label: "日语" },
  { id: "ko", label: "韩语" },
];

// 排序选项 - PRD 3.3.2
const SORT_OPTIONS = [
  { id: "default" as const, label: "综合排序" },
  { id: "heat" as const, label: "最热" },
  { id: "newest" as const, label: "最新" },
];

function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(keyword: string) {
  const list = getSearchHistory().filter((s) => s !== keyword);
  list.unshift(keyword);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

function clearSearchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

function formatHeat(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(0) + "k";
  return n.toString();
}

function formatPlayCount(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + "亿";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toString();
}

export default function SearchPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [history, setHistory] = useState<string[]>(getSearchHistory);
  const [hotKeywords, setHotKeywords] = useState<HotKeyword[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("songs");

  // 筛选 & 排序
  const [genre, setGenre] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [sortBy, setSortBy] = useState<"default" | "heat" | "newest">("default");
  const [showFilter, setShowFilter] = useState(false);

  // 歌手/专辑/歌单结果
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistBrief[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback((q: string) => {
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setShowSuggestions(false);
  }, [navigate]);

  // 加载热门搜索词
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hk = await getHotKeywords();
      if (!cancelled) setHotKeywords(hk);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 联想词 - 300ms 防抖 - PRD 3.3.1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || !showSuggestions) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const sgs = await getSearchSuggestions(query);
        setSuggestions(sgs);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, showSuggestions]);

  // 搜索主结果（歌曲）
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setArtists([]);
      setAlbums([]);
      setPlaylists([]);
      return;
    }
    saveSearchHistory(query.trim());
    // PRD 3.6.2 搜索记录 15%：同步给推荐算法
    usePlayerStore.getState().recordSearch(query.trim());
    setHistory(getSearchHistory());
    setPage(1);
    setHasMore(true);
    let cancelled = false;
    setLoading(true);
    setResults([]);
    setArtists([]);
    setAlbums([]);
    setPlaylists([]);

    (async () => {
      try {
        const [songsRes, artistsRes, albumsRes, playlistsRes] = await Promise.all([
          searchSongs(query, PAGE_SIZE),
          searchArtists(query),
          searchAlbums(query),
          searchPlaylists(query),
        ]);
        if (cancelled) return;
        setResults(songsRes);
        setArtists(artistsRes);
        setAlbums(albumsRes);
        setPlaylists(playlistsRes);
        setHasMore(songsRes.length >= PAGE_SIZE);
      } catch {
        if (!cancelled) {
          setResults([]);
          setArtists([]);
          setAlbums([]);
          setPlaylists([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  // 滚动加载 - PRD C3 - 每次加载 20 条
  useEffect(() => {
    if (!sentinelRef.current || loading || loadingMore || !hasMore) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          const nextPage = page + 1;
          try {
            const more = await searchSongs(query, PAGE_SIZE * nextPage);
            const newOnes = more.slice((nextPage - 1) * PAGE_SIZE, nextPage * PAGE_SIZE);
            if (newOnes.length === 0) {
              setHasMore(false);
            } else {
              setResults((prev) => {
                const ids = new Set(prev.map((s) => s.id));
                return [...prev, ...newOnes.filter((n) => !ids.has(n.id))];
              });
              setPage(nextPage);
              if (newOnes.length < PAGE_SIZE) setHasMore(false);
            }
          } catch {
            setHasMore(false);
          } finally {
            setLoadingMore(false);
          }
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, page, query]);

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  // 歌曲列表（应用筛选+排序）
  const displayedSongs = useMemo(() => {
    return filterAndSortSongs(
      results,
      { genre: genre || undefined, language: language || undefined },
      { by: sortBy },
      GENRE_KEYWORDS,
      LANGUAGE_KEYWORDS
    );
  }, [results, genre, language, sortBy]);

  const totalCount = displayedSongs.length;

  // 自动聚焦：进入页面时聚焦搜索框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-6" onClick={() => setShowSuggestions(false)}>
      {/* 搜索栏 - 顶部固定 */}
      <div
        className="flex items-center gap-2 rounded-card px-3 py-2 glass-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors flex-shrink-0"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 relative">
          <div className="flex items-center gap-2">
            <SearchIcon size={16} className="text-faint flex-shrink-0" />
            <input
              ref={inputRef}
              defaultValue={query}
              key={query}
              placeholder="搜索歌手、歌曲、专辑、歌单..."
              className="flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-faint font-dm"
              onChange={(e) => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                const v = e.target.value;
                if (!v.trim()) {
                  setSuggestions([]);
                  setShowSuggestions(true);
                  return;
                }
                setShowSuggestions(true);
                debounceRef.current = setTimeout(async () => {
                  try {
                    const sgs = await getSearchSuggestions(v);
                    setSuggestions(sgs);
                  } catch {
                    setSuggestions([]);
                  }
                }, 300);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) doSearch(v);
                }
                if (e.key === "Escape") {
                  setShowSuggestions(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            {query && (
              <button
                onClick={() => {
                  setShowSuggestions(false);
                  navigate("/search");
                }}
                className="text-faint hover:text-soft transition-colors flex-shrink-0"
                title="清空"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 联想下拉 - PRD 3.3.1 防抖 300ms */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-2 z-30 card-surface p-2 shadow-card-hover"
              onClick={(e) => e.stopPropagation()}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => doSearch(s.text)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-btn-icon text-left text-sm text-primary hover:bg-card-soft transition-colors font-dm"
                >
                  {s.type === "artist" ? (
                    <Mic2 size={14} className="text-soft" />
                  ) : s.type === "album" ? (
                    <Disc3 size={14} className="text-soft" />
                  ) : s.type === "playlist" ? (
                    <ListMusic size={14} className="text-soft" />
                  ) : (
                    <SearchIcon size={14} className="text-soft" />
                  )}
                  <span className="truncate flex-1">{s.text}</span>
                  <span className="text-xs text-faint">{suggestionTypeLabel(s.type)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {query && (
          <button
            onClick={() => doSearch(query)}
            className="px-3 py-1.5 rounded-btn-pill text-caption font-dm text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            搜索
          </button>
        )}
      </div>

      {/* 头部 - 标题 + Tab */}
      {query && (
        <div>
          <h1 className="font-outfit font-bold text-2xl text-primary">
            搜索: <span style={{ color: "var(--accent)" }}>{query}</span>
          </h1>
          {!loading && (
            <p className="font-dm text-xs text-soft mt-1">
              {activeTab === "songs" && `共找到 ${totalCount} 首歌曲`}
              {activeTab === "artists" && `${artists.length} 位歌手`}
              {activeTab === "albums" && `${albums.length} 张专辑`}
              {activeTab === "playlists" && `${playlists.length} 个歌单`}
            </p>
          )}

          {/* 分类标签 - PRD 3.3.1 */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="clickable-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-dm whitespace-nowrap transition-all duration-200"
                  style={
                    active
                      ? {
                          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
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

          {/* 筛选 + 排序 - 仅歌曲 Tab 显示 - PRD 3.3.2 */}
          {activeTab === "songs" && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={() => setShowFilter((v) => !v)}
                className="clickable-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-dm text-primary"
                style={{
                  background: showFilter ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "var(--card-soft)",
                  border: "1px solid var(--border)",
                }}
              >
                <Filter size={12} /> 筛选
                {(genre || language) && (
                  <span
                    className="ml-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </button>

              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id)}
                  className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm transition-all duration-200"
                  style={
                    sortBy === s.id
                      ? { background: "var(--accent)", color: "white" }
                      : { background: "var(--card-soft)", color: "var(--text-soft)" }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* 筛选选项面板 */}
          {activeTab === "songs" && showFilter && (
            <div className="mt-3 p-4 rounded-card card-surface space-y-3 animate-fade-in">
              <div>
                <p className="font-dm text-xs text-soft mb-2">语种</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setLanguage("")}
                    className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm"
                    style={
                      !language
                        ? { background: "var(--accent)", color: "white" }
                        : { background: "var(--card-soft)", color: "var(--text-soft)" }
                    }
                  >
                    全部
                  </button>
                  {LANGUAGE_OPTIONS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLanguage(l.id)}
                      className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm"
                      style={
                        language === l.id
                          ? { background: "var(--accent)", color: "white" }
                          : { background: "var(--card-soft)", color: "var(--text-soft)" }
                      }
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-dm text-xs text-soft mb-2">流派</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGenre("")}
                    className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm"
                    style={
                      !genre
                        ? { background: "var(--accent)", color: "white" }
                        : { background: "var(--card-soft)", color: "var(--text-soft)" }
                    }
                  >
                    全部
                  </button>
                  {GENRE_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGenre(g.id)}
                      className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm"
                      style={
                        genre === g.id
                          ? { background: "var(--accent)", color: "white" }
                          : { background: "var(--card-soft)", color: "var(--text-soft)" }
                      }
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 无搜索词时：显示历史和热门 */}
      {!query && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 搜索历史 - PRD 3.3.1 */}
          <div className="card-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-soft" />
                <span className="font-outfit text-sm font-semibold text-primary">搜索历史</span>
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-soft hover:text-red-500 transition-colors clickable-pill px-2 py-1"
                >
                  清空
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="font-dm text-xs text-soft py-6 text-center">暂无搜索历史</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {history.map((h) => (
                  <button
                    key={h}
                    onClick={() => doSearch(h)}
                    className="px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors"
                    style={{
                      background: "var(--card-soft)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 热门搜索 - PRD 3.3.1 */}
          <div className="card-surface p-5">
            <div className="flex items-center gap-1.5 mb-3">
              <Flame size={14} style={{ color: "var(--accent-2)" }} />
              <span className="font-outfit text-sm font-semibold text-primary">热门搜索</span>
              <span className="font-dm text-[10px] text-faint ml-auto flex items-center gap-1">
                <TrendingUp size={10} /> 实时更新
              </span>
            </div>
            {hotKeywords.length === 0 ? (
              <p className="font-dm text-xs text-soft py-6 text-center">加载中...</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {hotKeywords.slice(0, 10).map((hk) => (
                  <button
                    key={hk.rank}
                    onClick={() => doSearch(hk.text)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-btn-icon text-left hover:bg-card-soft transition-colors"
                  >
                    <span
                      className="w-5 h-5 flex items-center justify-center text-xs font-dm font-bold flex-shrink-0"
                      style={{
                        color: hk.rank <= 3 ? "var(--accent-2)" : "var(--text-faint)",
                      }}
                    >
                      {hk.rank}
                    </span>
                    <span className="font-dm text-sm text-primary truncate flex-1">{hk.text}</span>
                    <span className="font-dm text-[10px] text-faint flex-shrink-0">
                      {formatHeat(hk.heat)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 搜索结果区 */}
      {query && (
        <>
          {activeTab === "songs" && (
            <div className="space-y-3">
              {!loading && results.length > 0 && (
                <BatchActions
                  songs={displayedSongs.map((r, i) => ({
                    id: 9500 + i,
                    title: r.name,
                    artist: r.artists,
                    cover: r.picUrl || "",
                    src: "",
                    duration: r.duration ? r.duration / 1000 : 0,
                    neteaseId: r.id,
                    isLoading: false,
                    isFavorite: false,
                  }))}
                />
              )}
              <div className="card-surface p-1.5 sm:p-3 md:p-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
                    <p className="font-dm text-sm text-soft">正在搜索「{query}」...</p>
                  </div>
                ) : displayedSongs.length === 0 ? (
                  <div className="text-center py-12">
                    <Music2 size={36} className="mx-auto text-faint mb-3" />
                    <p className="font-dm text-sm text-soft">
                      {genre || language
                        ? "当前筛选条件下无结果，试试其他筛选"
                        : `未找到「${query}」相关歌曲`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {displayedSongs.map((song, i) => (
                      <SongRow
                        key={song.id}
                        song={{
                          id: 9500 + i,
                          title: song.name,
                          artist: song.artists,
                          cover: song.picUrl || "",
                          src: "",
                          duration: song.duration ? song.duration / 1000 : 0,
                          neteaseId: song.id,
                          isLoading: false,
                          isFavorite: false,
                        }}
                        index={i}
                        showPlaylistMenu
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* 滚动加载哨兵 - PRD C3 */}
              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
                  <span className="font-dm text-xs text-soft">加载更多...</span>
                </div>
              )}
              {!hasMore && results.length > 0 && !loading && (
                <p className="text-center font-dm text-xs text-faint py-4">
                  — 已显示全部 {totalCount} 首 —
                </p>
              )}
            </div>
          )}

          {activeTab === "artists" && (
            <div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
                </div>
              ) : artists.length === 0 ? (
                <div className="text-center py-12">
                  <Mic2 size={36} className="mx-auto text-faint mb-3" />
                  <p className="font-dm text-sm text-soft">未找到「{query}」相关歌手</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {artists.map((a) => (
                    <ArtistCard
                      key={a.id}
                      artist={a}
                      onClick={() => navigate(`/artist/${a.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "albums" && (
            <div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
                </div>
              ) : albums.length === 0 ? (
                <div className="text-center py-12">
                  <Disc3 size={36} className="mx-auto text-faint mb-3" />
                  <p className="font-dm text-sm text-soft">未找到「{query}」相关专辑</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {albums.map((al) => (
                    <AlbumCard
                      key={al.id}
                      album={al}
                      onClick={() => navigate(`/album/${al.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "playlists" && (
            <div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
                </div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-12">
                  <ListMusic size={36} className="mx-auto text-faint mb-3" />
                  <p className="font-dm text-sm text-soft">未找到「{query}」相关歌单</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {playlists.map((p) => (
                    <PlaylistCard
                      key={p.id}
                      playlist={p}
                      onClick={() => navigate(`/playlist/${p.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function suggestionTypeLabel(type: SearchSuggestion["type"]): string {
  switch (type) {
    case "artist":
      return "歌手";
    case "album":
      return "专辑";
    case "playlist":
      return "歌单";
    case "song":
      return "歌曲";
    default:
      return "关键词";
  }
}

function ArtistCard({ artist, onClick }: { artist: Artist; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left card-surface p-3 clickable-ring transition-all duration-200 hover:scale-[1.02]"
    >
      <div
        className="aspect-square rounded-full overflow-hidden mb-3 mx-auto"
        style={{
          width: "72%",
          boxShadow: "0 4px 16px -4px var(--accent)",
        }}
      >
        <img
          src={artist.avatar}
          alt={artist.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            if (t.parentElement)
              t.parentElement.style.background = "linear-gradient(135deg, var(--accent), var(--accent-2))";
          }}
        />
      </div>
      <h3 className="font-outfit font-semibold text-sm text-primary truncate text-center">
        {artist.name}
      </h3>
      <p className="font-dm text-xs text-soft mt-1 text-center">
        {artist.songCount} 首 · {artist.albumCount} 张专辑
      </p>
    </button>
  );
}

function AlbumCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left card-surface p-3 clickable-ring transition-all duration-200 hover:scale-[1.02]"
    >
      <div
        className="aspect-square rounded-btn-icon overflow-hidden mb-3"
        style={{ boxShadow: "0 4px 16px -4px var(--accent)" }}
      >
        <img
          src={album.cover}
          alt={album.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            if (t.parentElement)
              t.parentElement.style.background = "linear-gradient(135deg, var(--accent), var(--accent-2))";
          }}
        />
      </div>
      <h3 className="font-outfit font-semibold text-sm text-primary truncate">{album.name}</h3>
      <p className="font-dm text-xs text-soft mt-1 truncate">
        {album.artist} · {album.songCount} 首
      </p>
    </button>
  );
}

function PlaylistCard({
  playlist,
  onClick,
}: {
  playlist: PlaylistBrief;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left card-surface p-3 clickable-ring transition-all duration-200 hover:scale-[1.02]"
    >
      <div
        className="aspect-square rounded-btn-icon overflow-hidden mb-3"
        style={{ boxShadow: "0 4px 16px -4px var(--accent)" }}
      >
        <img
          src={playlist.cover}
          alt={playlist.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            if (t.parentElement)
              t.parentElement.style.background = "linear-gradient(135deg, var(--accent), var(--accent-2))";
          }}
        />
      </div>
      <h3 className="font-outfit font-semibold text-sm text-primary truncate">{playlist.name}</h3>
      <p className="font-dm text-xs text-soft mt-1 truncate">
        {playlist.creator} · {formatPlayCount(playlist.playCount)} 播放
      </p>
    </button>
  );
}
