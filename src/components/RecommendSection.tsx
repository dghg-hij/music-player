import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Radio,
  Heart,
  RefreshCw,
  Play,
  Pause,
  ListPlus,
  ChevronRight,
  Music2,
  Loader2,
} from "lucide-react";
import usePlayerStore from "../store/playerStore";
import PlaylistCard from "./PlaylistCard";
import SongRow from "./SongRow";
import type { Song } from "../types";

function DailyRecommendHero() {
  const navigate = useNavigate();
  const dailyRecommend = usePlayerStore((s) => s.dailyRecommend);
  const dailyRecommendStatus = usePlayerStore((s) => s.dailyRecommendStatus);
  const dailyRecommendDate = usePlayerStore((s) => s.dailyRecommendDate);
  const fetchDailyRecommend = usePlayerStore((s) => s.fetchDailyRecommend);
  const addDailyRecommendToQueue = usePlayerStore((s) => s.addDailyRecommendToQueue);
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const songs = usePlayerStore((s) => s.songs);

  // 进入页面自动拉取
  useEffect(() => {
    if (dailyRecommendStatus === "idle") {
      void fetchDailyRecommend();
    }
  }, [dailyRecommendStatus, fetchDailyRecommend]);

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const isLoaded = dailyRecommendStatus === "ready" && dailyRecommend.length > 0;

  // 当前正在播放的是日推歌曲
  const currentSong = songs[currentSongIndex];
  const isPlayingDaily = currentSong && dailyRecommend.some((s) => s.id === currentSong.id);

  const handlePlayAll = () => {
    if (dailyRecommend.length > 0) {
      usePlayerStore.getState().playDailyRecommendAt(0);
      navigate("/play");
    }
  };

  const handleRefresh = () => {
    void fetchDailyRecommend(true);
  };

  return (
    <section
      className="relative overflow-hidden rounded-card p-6 md:p-8 glass"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--card)) 0%, color-mix(in srgb, var(--accent-2) 6%, var(--card)) 100%)",
      }}
    >
      {/* 装饰光斑 */}
      <div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: "var(--accent)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "var(--accent-2)" }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <p className="font-dm text-xs text-soft mb-1.5 flex items-center gap-1.5">
              <Sparkles size={12} style={{ color: "var(--accent)" }} />
              <span>每日推荐 · {dateStr}</span>
              {dailyRecommendDate && (
                <span className="text-faint">· 已为今日生成</span>
              )}
            </p>
            <h2 className="font-outfit font-bold text-2xl md:text-3xl text-primary leading-tight">
              为你精选 30 首心动旋律
            </h2>
            <p className="font-dm text-xs text-soft mt-2 max-w-md">
              基于你的播放历史 40% · 收藏 30% · 搜索 15% · 偏好 15% 智能排序
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={dailyRecommendStatus === "loading"}
              className="w-9 h-9 rounded-full flex items-center justify-center text-soft hover:text-primary transition-colors clickable-pill"
              aria-label="刷新每日推荐"
              title="刷新每日推荐"
            >
              {dailyRecommendStatus === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
            </button>
            <Link
              to="/recommend"
              className="px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary clickable-pill flex items-center gap-1"
            >
              查看全部
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {dailyRecommendStatus === "loading" && dailyRecommend.length === 0 ? (
          <div className="text-center py-12">
            <Loader2
              size={32}
              className="mx-auto text-faint mb-3 animate-spin"
              style={{ color: "var(--accent)" }}
            />
            <p className="font-dm text-sm text-soft">正在为你生成今日推荐...</p>
          </div>
        ) : dailyRecommendStatus === "error" && dailyRecommend.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles size={32} className="mx-auto text-faint mb-3" style={{ color: "var(--accent)" }} />
            <p className="font-dm text-sm text-soft mb-3">推荐生成失败，请稍后重试</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-full text-sm font-dm text-white"
              style={{ background: "var(--accent)" }}
            >
              重新生成
            </button>
          </div>
        ) : isLoaded ? (
          <>
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={handlePlayAll}
                className="clickable-pill px-5 py-2 rounded-full text-sm font-dm font-semibold text-white flex items-center gap-1.5"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                }}
              >
                {isPlaying && isPlayingDaily ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
                {isPlaying && isPlayingDaily ? "暂停" : "播放全部"}
              </button>
              <button
                onClick={addDailyRecommendToQueue}
                className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-primary flex items-center gap-1.5"
                style={{ background: "var(--card-soft)", border: "1px solid var(--border-strong)" }}
              >
                <ListPlus size={14} />
                全部加入待播放
              </button>
            </div>

            <div className="card-surface p-2 md:p-3">
              <div className="space-y-0.5">
                {dailyRecommend.slice(0, 10).map((song: Song, i: number) => (
                  <SongRow key={song.id} song={song} index={i} />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function FmCard() {
  const navigate = useNavigate();
  const fmStatus = usePlayerStore((s) => s.fmStatus);
  const fmCurrentReason = usePlayerStore((s) => s.fmCurrentReason);
  const startFm = usePlayerStore((s) => s.startFm);
  const fmNext = usePlayerStore((s) => s.fmNext);
  const fmDislikeCurrent = usePlayerStore((s) => s.fmDislikeCurrent);

  const currentSong = usePlayerStore((s) => {
    const { songs, currentSongIndex } = s;
    return songs[currentSongIndex];
  });

  const handleStart = async () => {
    await startFm();
    navigate("/play");
  };

  return (
    <section
      className="relative overflow-hidden rounded-card p-5 md:p-6 glass flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, #06b6d4 10%, var(--card)) 0%, color-mix(in srgb, var(--accent) 8%, var(--card)) 100%)",
      }}
    >
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: "#06b6d4" }}
      />

      <div className="relative flex items-center gap-2 mb-3">
        <Radio size={18} style={{ color: "#06b6d4" }} />
        <h3 className="font-outfit font-bold text-lg text-primary">私人 FM</h3>
        <span
          className="ml-auto text-[10px] font-dm px-2 py-0.5 rounded-full text-white"
          style={{ background: "#06b6d4" }}
        >
          无限流
        </span>
      </div>

      {currentSong && fmStatus === "ready" ? (
        <div className="relative flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-14 h-14 rounded-btn-icon overflow-hidden flex-shrink-0"
              style={{ boxShadow: "0 0 14px -2px #06b6d4" }}
            >
              {currentSong.cover ? (
                <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #06b6d4, var(--accent))" }}
                >
                  <Music2 size={20} className="text-white/70" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-outfit font-semibold text-sm text-primary truncate">
                {currentSong.title}
              </p>
              <p className="font-dm text-xs text-soft truncate">{currentSong.artist}</p>
              {fmCurrentReason && (
                <p className="font-dm text-[10px] text-faint mt-1 truncate flex items-center gap-1">
                  <Sparkles size={10} />
                  {fmCurrentReason}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-auto">
            <button
              onClick={() => void fmDislikeCurrent()}
              className="clickable-pill w-9 h-9 rounded-full flex items-center justify-center text-soft hover:text-error transition-colors"
              aria-label="不喜欢"
              title="不喜欢，跳过"
            >
              <Heart size={14} />
            </button>
            <button
              onClick={() => void fmNext()}
              className="flex-1 py-2 rounded-full text-sm font-dm font-semibold text-white flex items-center justify-center gap-1.5"
              style={{
                background: "linear-gradient(135deg, #06b6d4, var(--accent))",
              }}
            >
              <Play size={14} fill="white" />
              下一首
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col">
          <p className="font-dm text-xs text-soft mb-4 leading-relaxed">
            实时算法推荐，无限不重样。每首歌都是为你而选。
          </p>
          <button
            onClick={handleStart}
            disabled={fmStatus === "loading"}
            className="mt-auto py-2.5 rounded-full text-sm font-dm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #06b6d4, var(--accent))",
            }}
          >
            {fmStatus === "loading" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                正在调频
              </>
            ) : (
              <>
                <Play size={14} fill="white" />
                开启 FM
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

function GuessSection() {
  const guessPlaylists = usePlayerStore((s) => s.guessPlaylists);
  const guessStatus = usePlayerStore((s) => s.guessStatus);
  const fetchGuessYouLike = usePlayerStore((s) => s.fetchGuessYouLike);

  useEffect(() => {
    if (guessStatus === "idle" && guessPlaylists.length === 0) {
      void fetchGuessYouLike(true);
    }
  }, [guessStatus, guessPlaylists.length, fetchGuessYouLike]);

  if (guessStatus === "loading" && guessPlaylists.length === 0) {
    return (
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-outfit font-bold text-2xl text-primary">猜你喜欢</h2>
            <p className="font-dm text-xs text-soft mt-1">歌单 · 专辑 · 协同过滤推荐</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-card-soft animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (guessPlaylists.length === 0) return null;

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-outfit font-bold text-2xl text-primary">猜你喜欢</h2>
          <p className="font-dm text-xs text-soft mt-1">基于协同过滤 + 内容推荐</p>
        </div>
        <Link
          to="/recommend"
          className="font-dm text-xs text-soft hover:text-primary transition-colors flex items-center gap-1 clickable-pill px-3 py-1.5"
        >
          查看更多 <ChevronRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {guessPlaylists.slice(0, 4).map((item) => (
          <PlaylistCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function RecommendSection() {
  return (
    <div className="space-y-8">
      <DailyRecommendHero />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <FmCard />
        </div>
        <div className="md:col-span-2">
          <GuessSection />
        </div>
      </div>
    </div>
  );
}
