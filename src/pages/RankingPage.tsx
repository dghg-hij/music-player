import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Flame, Loader2, Play, ListPlus, ChevronRight } from "lucide-react";
import { RANKINGS } from "../data/songs";
import usePlayerStore from "../store/playerStore";
import { getChartSongs } from "../services/musicApi";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import type { Song } from "../types";

export default function RankingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  const ranking = RANKINGS.find((r) => r.id === id) ?? RANKINGS[0];

  useEffect(() => {
    if (!ranking) return;
    let cancelled = false;
    setLoading(true);
    setSongs([]);
    (async () => {
      try {
        const results = await getChartSongs(ranking.playlistId, 30, ranking.query);
        if (cancelled) return;
        const list: Song[] = results.map((r, i) => ({
          id: 6000 + i,
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
        setSongs(list);
      } catch {
        if (!cancelled) setSongs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ranking]);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playSong(songs[0]);
    navigate("/play");
  };

  if (!ranking) {
    return (
      <div className="text-center py-20">
        <p className="font-dm text-soft">未找到该排行榜</p>
        <Link
          to="/library"
          className="inline-block mt-4 clickable-pill px-4 py-2 rounded-full text-sm font-dm text-primary"
          style={{ background: "var(--card-soft)" }}
        >
          返回乐库
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部：榜单标题 + 描述 */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-8"
        style={{
          background: `linear-gradient(135deg, ${ranking.accent}30 0%, var(--card) 70%)`,
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: ranking.accent }}
        />
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-dm text-xs text-soft hover:text-primary transition-colors clickable-pill px-3 py-1.5 mb-4"
        >
          <ArrowLeft size={14} /> 返回首页
        </Link>
        <div className="flex items-center gap-5">
          <div
            className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ boxShadow: `0 0 30px -4px ${ranking.accent}99` }}
          >
            <img
              src={ranking.cover}
              alt={ranking.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
                if (t.parentElement)
                  t.parentElement.style.background = `linear-gradient(135deg, ${ranking.accent}, var(--accent-2))`;
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.3)" }}
            >
              <Flame size={28} className="text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-dm text-xs text-soft mb-1 flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: ranking.accent }}
              />
              排行榜
            </p>
            <h1 className="font-outfit font-bold text-2xl md:text-3xl text-primary">
              {ranking.name}
            </h1>
            <p className="font-dm text-xs text-soft mt-1 line-clamp-2">
              {ranking.description}
            </p>
            <p className="font-dm text-[11px] text-faint mt-1">
              共 {songs.length} 首歌曲 · 每周更新
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handlePlayAll}
                disabled={songs.length === 0}
                className="clickable-pill px-3.5 py-1.5 rounded-full text-xs font-dm text-white disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${ranking.accent}, var(--accent-2))`,
                }}
              >
                <Play size={12} className="inline mr-1" fill="currentColor" /> 播放全部
              </button>
              <button
                onClick={() => songs.forEach((s) => addToQueue(s))}
                disabled={songs.length === 0}
                className="clickable-pill px-3.5 py-1.5 rounded-full text-xs font-dm text-primary disabled:opacity-50"
                style={{
                  background: "var(--card-soft)",
                  border: "1px solid var(--border-strong)",
                }}
              >
                <ListPlus size={12} className="inline mr-1" /> 加入待播放
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 歌曲词条上方：榜单切换 Tab */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {RANKINGS.map((r) => {
          const isActive = r.id === ranking.id;
          return (
            <button
              key={r.id}
              onClick={() => {
                if (r.id !== ranking.id) navigate(`/ranking/${r.id}`);
              }}
              className="clickable-pill flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-dm transition-all whitespace-nowrap flex items-center gap-1"
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
              {isActive && <ChevronRight size={12} />}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {!loading && songs.length > 0 && <BatchActions songs={songs} />}
        <div className="card-surface p-2 md:p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: ranking.accent }} />
            <p className="font-dm text-sm text-soft">正在拉取{ranking.name}...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-dm text-sm text-soft">该榜单暂无数据</p>
          </div>
        ) : (
          <div className="space-y-1">
            {songs.map((song, i) => (
              <SongRow key={song.id} song={song} rank={i} showRank />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
