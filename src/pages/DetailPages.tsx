import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Music2, Play, ListPlus, Mic2, Disc3, ListMusic } from "lucide-react";
import {
  getArtistDetail,
  getAlbumDetail,
  getPlaylistBriefDetail,
  searchSongs,
  type Artist,
  type Album,
  type PlaylistBrief,
  type SearchResult,
} from "../services/musicApi";
import usePlayerStore from "../store/playerStore";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";
import type { Song } from "../types";

// ============================================
// 歌手详情页 - PRD 3.3.1 5b
// ============================================
export function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playSong = usePlayerStore((s) => s.playSong);

  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const a = await getArtistDetail(id);
      if (cancelled) return;
      setArtist(a);
      if (a) {
        const res = await searchSongs(a.name, a.songCount);
        if (!cancelled) setSongs(res);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playSong(mapToSong(songs[0]));
    navigate("/play");
  };

  const handleShuffle = () => {
    if (songs.length === 0) return;
    const idx = Math.floor(Math.random() * songs.length);
    playSong(mapToSong(songs[idx]));
    navigate("/play");
  };

  if (!artist) {
    return (
      <DetailShell title="未找到该歌手" onBack={() => navigate(-1)} />
    );
  }

  return (
    <div className="space-y-6">
      <DetailHero
        avatar={artist.avatar}
        title={artist.name}
        subtitle="歌手"
        meta={`${artist.songCount} 首歌曲 · ${artist.albumCount} 张专辑`}
        accent="#A855F7"
        onBack={() => navigate(-1)}
        actions={
          <>
            <ActionButton
              onClick={handlePlayAll}
              disabled={songs.length === 0}
              primary
              icon={<Play size={14} fill="currentColor" />}
              label="播放全部"
            />
            <ActionButton
              onClick={handleShuffle}
              disabled={songs.length === 0}
              icon={<ListPlus size={14} />}
              label="随机播放"
            />
          </>
        }
      />

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
            <p className="font-dm text-sm text-soft">正在加载 {artist.name} 的歌曲...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-12">
            <Music2 size={36} className="mx-auto text-faint mb-3" />
            <p className="font-dm text-sm text-soft">暂无 {artist.name} 的歌曲</p>
          </div>
        ) : (
          <>
            <BatchActions songs={songs.map((s, i) => mapToSong(s, i))} />
            <div className="card-surface p-2 md:p-4 space-y-1">
              {songs.map((s, i) => (
                <SongRow
                  key={s.id}
                  song={mapToSong(s, i)}
                  index={i}
                  showPlaylistMenu
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// 专辑详情页 - PRD 3.3.1 5c
// ============================================
export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playSong = usePlayerStore((s) => s.playSong);

  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const a = await getAlbumDetail(id);
      if (cancelled) return;
      setAlbum(a);
      if (a) {
        const res = await searchSongs(`${a.artist} ${a.name}`, a.songCount);
        if (!cancelled) setSongs(res.slice(0, a.songCount));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playSong(mapToSong(songs[0]));
    navigate("/play");
  };

  if (!album) {
    return <DetailShell title="未找到该专辑" onBack={() => navigate(-1)} />;
  }

  return (
    <div className="space-y-6">
      <DetailHero
        cover={album.cover}
        title={album.name}
        subtitle="专辑"
        meta={`${album.artist} · ${album.releaseDate} · ${album.songCount} 首`}
        accent="#06B6D4"
        onBack={() => navigate(-1)}
        actions={
          <ActionButton
            onClick={handlePlayAll}
            disabled={songs.length === 0}
            primary
            icon={<Play size={14} fill="currentColor" />}
            label="播放全部"
          />
        }
        extra={
          <Link
            to={`/artist/${album.artistId}`}
            className="inline-flex items-center gap-1.5 mt-2 clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors"
            style={{ background: "var(--card-soft)" }}
          >
            <Mic2 size={12} /> 歌手：{album.artist}
          </Link>
        }
      />

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
            <p className="font-dm text-sm text-soft">正在加载专辑歌曲...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-12">
            <Music2 size={36} className="mx-auto text-faint mb-3" />
            <p className="font-dm text-sm text-soft">该专辑暂无在线歌曲</p>
          </div>
        ) : (
          <>
            <BatchActions songs={songs.map((s, i) => mapToSong(s, i))} />
            <div className="card-surface p-2 md:p-4 space-y-1">
              {songs.map((s, i) => (
                <SongRow
                  key={s.id}
                  song={mapToSong(s, i)}
                  index={i}
                  showPlaylistMenu
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// 歌单详情页 - PRD 3.3.1 5d
// ============================================
export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const [playlist, setPlaylist] = useState<PlaylistBrief | null>(null);
  const [songs, setSongs] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const p = await getPlaylistBriefDetail(id);
      if (cancelled) return;
      setPlaylist(p);
      if (p) {
        // 歌单是预设名字，直接搜该歌单名
        const res = await searchSongs(p.name, Math.min(p.songCount, 20));
        if (!cancelled) setSongs(res);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playSong(mapToSong(songs[0]));
    navigate("/play");
  };

  if (!playlist) {
    return <DetailShell title="未找到该歌单" onBack={() => navigate(-1)} />;
  }

  return (
    <div className="space-y-6">
      <DetailHero
        cover={playlist.cover}
        title={playlist.name}
        subtitle="歌单"
        meta={`${playlist.creator} · ${playlist.songCount} 首 · ${formatPlayCount(playlist.playCount)} 播放`}
        accent="#F97316"
        onBack={() => navigate(-1)}
        actions={
          <>
            <ActionButton
              onClick={handlePlayAll}
              disabled={songs.length === 0}
              primary
              icon={<Play size={14} fill="currentColor" />}
              label="播放全部"
            />
            <ActionButton
              onClick={() => songs.forEach((s) => addToQueue(mapToSong(s)))}
              disabled={songs.length === 0}
              icon={<ListPlus size={14} />}
              label="加入待播放"
            />
          </>
        }
      />

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
            <p className="font-dm text-sm text-soft">正在加载歌单...</p>
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
                  index={i}
                  showPlaylistMenu
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// 共用组件
// ============================================
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

function formatPlayCount(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + "亿";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toString();
}

function DetailShell({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="text-center py-20">
      <p className="font-dm text-soft">{title}</p>
      <button
        onClick={onBack}
        className="clickable-pill mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-dm text-primary"
        style={{ background: "var(--card-soft)" }}
      >
        <ArrowLeft size={14} /> 返回
      </button>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  primary,
  icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-white disabled:opacity-50 flex items-center gap-1.5"
      style={
        primary
          ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }
          : { background: "var(--card-soft)", color: "var(--text)" }
      }
    >
      {icon}
      {label}
    </button>
  );
}

function DetailHero({
  cover,
  avatar,
  title,
  subtitle,
  meta,
  accent,
  onBack,
  actions,
  extra,
}: {
  cover?: string;
  avatar?: string;
  title: string;
  subtitle: string;
  meta: string;
  accent: string;
  onBack: () => void;
  actions: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const imgSrc = cover || avatar || "";
  const isCircle = !cover && !!avatar;
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6 md:p-8"
      style={{
        background: `linear-gradient(135deg, ${accent}30 0%, var(--card) 70%)`,
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: accent }}
      />
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 font-dm text-xs text-soft hover:text-primary transition-colors clickable-pill px-3 py-1.5 mb-4"
      >
        <ArrowLeft size={14} /> 返回
      </button>
      <div className="flex items-center gap-5">
        <div
          className={`${isCircle ? "rounded-full" : "rounded-2xl"} overflow-hidden flex-shrink-0 w-24 h-24 md:w-32 md:h-32`}
          style={{ boxShadow: `0 0 30px -4px ${accent}99` }}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
                if (t.parentElement)
                  t.parentElement.style.background = `linear-gradient(135deg, ${accent}, var(--accent-2))`;
              }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accent}, var(--accent-2))` }}
            >
              {isCircle ? (
                <Mic2 size={32} className="text-white" />
              ) : subtitle === "歌单" ? (
                <ListMusic size={32} className="text-white" />
              ) : (
                <Disc3 size={32} className="text-white" />
              )}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-dm text-xs text-soft mb-1">{subtitle}</p>
          <h1 className="font-outfit font-bold text-3xl md:text-4xl text-primary leading-tight truncate">
            {title}
          </h1>
          <p className="font-dm text-sm text-soft mt-2 truncate">{meta}</p>
          {extra}
          <div className="flex flex-wrap gap-2 mt-4">{actions}</div>
        </div>
      </div>
    </div>
  );
}
