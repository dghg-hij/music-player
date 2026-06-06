import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Music2, Clock } from "lucide-react";
import { searchSongs } from "../services/musicApi";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import type { Song } from "../types";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 15;

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

export default function SearchPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>(getSearchHistory);

  const doSearch = useCallback((q: string) => {
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }, [navigate]);

  useEffect(() => {
    if (!query.trim()) return;
    saveSearchHistory(query.trim());
    setHistory(getSearchHistory());
    let cancelled = false;
    setLoading(true);
    setResults([]);
    (async () => {
      try {
        const r = await searchSongs(query, 30);
        if (cancelled) return;
        const mapped: Song[] = r.map((it, i) => ({
          id: 9500 + i,
          title: it.name,
          artist: it.artists,
          cover: it.picUrl || "",
          src: "",
          duration: it.duration ? it.duration / 1000 : 0,
          neteaseId: it.id,
          isLoading: false,
          isFavorite: false,
        }));
        setResults(mapped);
      } catch {
        if (cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> 返回
        </button>
        <div>
          <h1 className="font-outfit font-bold text-2xl text-primary">
            {query ? `搜索: ${query}` : "搜索"}
          </h1>
          {query && (
            <p className="font-dm text-xs text-soft mt-0.5">
              {loading ? "搜索中..." : `共找到 ${results.length} 首`}
            </p>
          )}
        </div>
      </div>

      {!query && history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-soft" />
              <span className="font-outfit text-sm font-semibold text-primary">搜索历史</span>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-xs text-soft hover:text-red-500 transition-colors"
            >
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h}
                onClick={() => doSearch(h)}
                className="px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors"
                style={{
                  background: "var(--card-soft, rgba(255,255,255,0.06))",
                  border: "1px solid var(--border)",
                }}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {query ? (
        <div className="space-y-3">
          {!loading && results.length > 0 && <BatchActions songs={results} />}
          <div className="card-surface p-1.5 sm:p-3 md:p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
              <p className="font-dm text-sm text-soft">正在搜索...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <Music2 size={36} className="mx-auto text-faint mb-3" />
              <p className="font-dm text-sm text-soft">未找到相关歌曲</p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((song, i) => (
                <SongRow key={song.id} song={song} index={i} showPlaylistMenu />
              ))}
            </div>
          )}
        </div>
        </div>
      ) : (
        !history.length && (
          <div className="text-center py-16">
            <Music2 size={36} className="mx-auto text-faint mb-3" />
            <p className="font-dm text-sm text-soft">输入关键词开始搜索</p>
          </div>
        )
      )}
    </div>
  );
}
