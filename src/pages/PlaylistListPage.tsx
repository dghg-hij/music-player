import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Music2,
  Play,
  ListPlus,
  ListMusic,
} from "lucide-react";
import {
  getPlaylistAlbumById,
  getPlaylistAlbumSongs,
  type SearchResult,
} from "../services/musicApi";
import usePlayerStore from "../store/playerStore";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import type { Song } from "../types";

export default function PlaylistListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const album = id ? getPlaylistAlbumById(id) : null;
  const [songs, setSongs] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getPlaylistAlbumSongs(id);
      if (!cancelled) {
        // 严格保证 30 首歌（不足则补默认）
        const list = res.slice(0, 30);
        if (list.length < 30) {
          // 不足时用同一关键词再补一批
          const more = await getPlaylistAlbumSongs(id);
          const seen = new Set(list.map((s) => s.id));
          for (const m of more) {
            if (list.length >= 30) break;
            if (!seen.has(m.id)) {
              list.push(m);
              seen.add(m.id);
            }
          }
        }
        setSongs(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!album) {
    return (
      <div className="text-center py-20">
        <p className="font-dm text-soft">未找到该歌单</p>
        <button
          onClick={() => navigate(-1)}
          className="clickable-pill mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-dm text-primary"
          style={{ background: "var(--card-soft)" }}
        >
          <ArrowLeft size={14} /> 返回
        </button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playSong(mapToSong(songs[0], 0));
    navigate("/play");
  };

  return (
    <div className="space-y-6">
      {/* Hero 头部 */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-8"
        style={{
          background: `linear-gradient(135deg, ${album.accent}30 0%, var(--card) 70%)`,
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: album.accent }}
        />
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 font-dm text-xs text-soft hover:text-primary transition-colors clickable-pill px-3 py-1.5 mb-4"
        >
          <ArrowLeft size={14} /> 返回
        </button>
        <div className="flex items-center gap-5">
          <div
            className="rounded-2xl overflow-hidden flex-shrink-0 w-24 h-24 md:w-32 md:h-32"
            style={{ boxShadow: `0 0 30px -4px ${album.accent}99` }}
          >
            <img
              src={album.cover}
              alt={album.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
                if (t.parentElement)
                  t.parentElement.style.background = `linear-gradient(135deg, ${album.accent}, var(--accent-2))`;
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-dm text-xs text-soft mb-1 flex items-center gap-1.5">
              <ListMusic size={12} /> 歌单
            </p>
            <h1 className="font-outfit font-bold text-3xl md:text-4xl text-primary leading-tight truncate">
              {album.name}
            </h1>
            <p className="font-dm text-sm text-soft mt-2 truncate">
              {album.description} · 共 30 首
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={handlePlayAll}
                disabled={songs.length === 0}
                className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-white disabled:opacity-50 flex items-center gap-1.5"
                style={{
                  background: `linear-gradient(135deg, ${album.accent}, var(--accent-2))`,
                }}
              >
                <Play size={14} fill="currentColor" /> 播放全部
              </button>
              <button
                onClick={() => songs.forEach((s, i) => addToQueue(mapToSong(s, i)))}
                disabled={songs.length === 0}
                className="clickable-pill px-4 py-2 rounded-full text-sm font-dm disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: "var(--card-soft)", color: "var(--text)" }}
              >
                <ListPlus size={14} /> 加入待播放
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 歌曲列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: album.accent }} />
            <p className="font-dm text-sm text-soft">正在加载 {album.name} · 30 首...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-12">
            <Music2 size={36} className="mx-auto text-faint mb-3" />
            <p className="font-dm text-sm text-soft">该歌单暂无在线歌曲</p>
          </div>
        ) : (
          <>
            <BatchActions songs={songs.map((s, i) => mapToSong(s, i))} />
            <div className="card-surface p-2 md:p-4 space-y-1">
              {songs.map((s, i) => (
                <SongRow
                  key={s.id}
                  song={mapToSong(s, i)}
                  rank={i}
                  showRank
                  showPlaylistMenu
                />
              ))}
            </div>
            <p className="text-center font-dm text-xs text-soft py-2">
              — 共 {songs.length} 首 —
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function mapToSong(s: SearchResult, idx: number = 0): Song {
  return {
    id: 7000 + idx + s.id,
    title: s.name,
    artist: s.artists,
    cover: s.picUrl || "",
    src: "",
    duration: s.duration ? s.duration / 1000 : 0,
    neteaseId: s.id,
    isLoading: false,
    isFavorite: false,
  };
}
