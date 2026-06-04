import { useState, useRef, useCallback, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { searchSongs } from "../services/musicApi";
import type { Song } from "../types";
import usePlayerStore from "../store/playerStore";

interface SearchBarProps {
  onSearchResult: (songs: Song[]) => void;
  onClearSearch: () => void;
  isSearching: boolean;
}

export default function SearchBar({ onSearchResult, onClearSearch, isSearching }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      onClearSearch();
      return;
    }
    try {
      const results = await searchSongs(keyword, 20);
      const mapped: Song[] = results.map((r, i) => ({
        id: 9000 + i,
        title: r.name,
        artist: r.artists,
        cover: r.picUrl || "",
        src: "",
        duration: r.duration ? r.duration / 1000 : 0,
        neteaseId: r.id,
        isLoading: false,
      }));
      onSearchResult(mapped);
    } catch {
      onClearSearch();
    }
  }, [onSearchResult, onClearSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) {
      onClearSearch();
      return;
    }
    timerRef.current = setTimeout(() => doSearch(val), 400);
  }, [doSearch, onClearSearch]);

  const handleClear = useCallback(() => {
    setQuery("");
    onClearSearch();
    inputRef.current?.focus();
  }, [onClearSearch]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 ${
          isFocused
            ? "bg-white/10 ring-1 ring-accent/50"
            : "bg-white/5"
        }`}
      >
        {isSearching ? (
          <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
        ) : (
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="搜索歌手或歌曲..."
          className="flex-1 bg-transparent text-sm text-white placeholder-white/30 font-dm outline-none"
        />
        {query && (
          <button
            onClick={handleClear}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
