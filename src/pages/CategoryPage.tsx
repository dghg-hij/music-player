import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Play, Shuffle, ListPlus } from "lucide-react";
import { CATEGORIES, CATEGORY_KEYWORDS } from "../data/songs";
import usePlayerStore from "../store/playerStore";
import { searchSongs } from "../services/musicApi";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import type { Song } from "../types";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const songs = usePlayerStore((s) => s.songs);
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const [remoteSongs, setRemoteSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  const category = CATEGORIES.find((c) => c.id === id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setRemoteSongs([]);
    const keywords = CATEGORY_KEYWORDS[id] || [id];
    (async () => {
      const all: Song[] = [];
      const seen = new Set<number>();
      for (const kw of keywords.slice(0, 4)) {
        try {
          const r = await searchSongs(kw, 8);
          r.forEach((it) => {
            if (!seen.has(it.id) && all.length < 30) {
              seen.add(it.id);
              all.push({
                id: 8000 + all.length,
                title: it.name,
                artist: it.artists,
                cover: it.picUrl || "",
                src: "",
                duration: it.duration ? it.duration / 1000 : 0,
                neteaseId: it.id,
                isLoading: false,
                isFavorite: false,
                categoryId: id,
              });
            }
          });
        } catch {
          /* ignore single keyword failure */
        }
      }
      if (!cancelled) {
        setRemoteSongs(all);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const list = useMemo(() => {
    if (!id) return [];
    const local = songs.filter((s) => s.categoryId === id);
    if (remoteSongs.length > 0) {
      return [...local, ...remoteSongs];
    }
    return local;
  }, [songs, remoteSongs, id]);

  const handlePlayAll = () => {
    if (list.length === 0) return;
    playSong(list[0]);
    navigate("/play");
  };

  const handleShuffle = () => {
    if (list.length === 0) return;
    const idx = Math.floor(Math.random() * list.length);
    playSong(list[idx]);
    navigate("/play");
  };

  if (!category) {
    return (
      <div className="text-center py-20">
        <p className="font-dm text-soft">未找到该分类</p>
        <Link
          to="/"
          className="inline-block mt-4 clickable-pill px-4 py-2 rounded-full text-sm font-dm text-primary"
          style={{ background: "var(--card-soft)" }}
        >
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-8"
        style={{
          background: `linear-gradient(135deg, ${category.accent}30 0%, var(--card) 70%)`,
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: category.accent }}
        />
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-dm text-xs text-soft hover:text-primary transition-colors clickable-pill px-3 py-1.5 mb-4"
        >
          <ArrowLeft size={14} /> 返回首页
        </Link>
        <div className="flex items-center gap-5">
          <div
            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ boxShadow: `0 0 30px -4px ${category.accent}99` }}
          >
            <img
              src={category.cover}
              alt={category.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
                if (t.parentElement)
                  t.parentElement.style.background = `linear-gradient(135deg, ${category.accent}, var(--accent-2))`;
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-outfit font-bold text-3xl md:text-4xl text-primary">
              {category.name}
            </h1>
            <p className="font-dm text-sm text-soft mt-2">
              {category.description}
            </p>
            <p className="font-dm text-xs text-faint mt-1">
              共 {list.length} 首歌曲
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handlePlayAll}
                disabled={list.length === 0}
                className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-white disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${category.accent}, var(--accent-2))`,
                }}
              >
                <Play size={14} className="inline mr-1" fill="currentColor" /> 播放全部
              </button>
              <button
                onClick={handleShuffle}
                disabled={list.length === 0}
                className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-primary disabled:opacity-50"
                style={{
                  background: "var(--card-soft)",
                  border: "1px solid var(--border-strong)",
                }}
              >
                <Shuffle size={14} className="inline mr-1" /> 随机播放
              </button>
              <button
                onClick={() => list.forEach((s) => addToQueue(s))}
                disabled={list.length === 0}
                className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-primary disabled:opacity-50"
                style={{
                  background: "var(--card-soft)",
                  border: "1px solid var(--border-strong)",
                }}
              >
                <ListPlus size={14} className="inline mr-1" /> 加入待播放
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {!loading && list.length > 0 && <BatchActions songs={list} />}
        <div className="card-surface p-2 md:p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
            <p className="font-dm text-sm text-soft">正在为你挑选{category.name}好歌...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-dm text-sm text-soft">该分类暂无歌曲</p>
          </div>
        ) : (
          <div className="space-y-1">
            {list.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
