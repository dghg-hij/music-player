import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Radio,
  Heart,
  RefreshCw,
  Play,
  Pause,
  ListPlus,
  Music2,
  Loader2,
  ChevronDown,
  Filter,
  Check,
  Settings2,
  LogIn,
} from "lucide-react";
import usePlayerStore from "../store/playerStore";
import useAuthStore from "../store/authStore";
import PlaylistCard from "./PlaylistCard";
import SongRow from "./SongRow";
import {
  PREFERENCE_TAGS,
  type Song,
  type RecommendPlaylist,
  type RecommendWeights,
} from "../types";
import { DEFAULT_RECOMMEND_WEIGHTS } from "../types";

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function WeightBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-dm mb-1">
        <span className="text-soft">{label}</span>
        <span className="text-primary font-semibold">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-soft)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

function PreferencesPanel() {
  const preferences = usePlayerStore((s) => s.preferences);
  const togglePreference = usePlayerStore((s) => s.togglePreference);
  const weights = usePlayerStore((s) => s.recommendWeights);
  const setRecommendWeights = usePlayerStore((s) => s.setRecommendWeights);
  const [showWeights, setShowWeights] = useState(false);

  return (
    <section
      className="rounded-card p-5 md:p-6 glass"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Filter size={16} style={{ color: "var(--accent)" }} />
        <h3 className="font-outfit font-bold text-base text-primary">调整你的偏好</h3>
        <button
          onClick={() => setShowWeights((v) => !v)}
          className="ml-auto text-xs font-dm text-soft hover:text-primary clickable-pill px-3 py-1.5 rounded-full flex items-center gap-1"
        >
          <Settings2 size={12} />
          {showWeights ? "收起" : "算法权重"}
          <ChevronDown size={12} className={`transition-transform ${showWeights ? "rotate-180" : ""}`} />
        </button>
      </div>

      <p className="font-dm text-xs text-soft mb-3">
        选择你感兴趣的音乐风格，下次推荐会更精准（PRD 3.6.2 主动偏好 15%）
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {PREFERENCE_TAGS.map((tag) => {
          const active = preferences.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => togglePreference(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-dm transition-all duration-200 flex items-center gap-1 ${
                active ? "text-white" : "text-soft hover:text-primary"
              }`}
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                      boxShadow: "0 2px 10px -2px var(--accent)",
                    }
                  : {
                      background: "var(--card-soft)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              {active && <Check size={10} />}
              {tag}
            </button>
          );
        })}
      </div>

      {showWeights && (
        <div className="mt-4 pt-4 border-t border-default space-y-3">
          <p className="font-dm text-xs text-soft">推荐算法权重（PRD 3.6.2）</p>
          <WeightBar
            label="播放历史"
            value={weights.history}
            color="var(--accent)"
          />
          <WeightBar
            label="收藏 / 喜欢"
            value={weights.favorite}
            color="var(--accent-2)"
          />
          <WeightBar
            label="搜索记录"
            value={weights.search}
            color="#22c55e"
          />
          <WeightBar
            label="主动偏好"
            value={weights.preference}
            color="#f59e0b"
          />
          <div className="flex items-center gap-2 pt-2">
            <span className="font-dm text-xs text-faint">微调权重：</span>
            {(
              [
                { k: "history" as const, l: "历史" },
                { k: "favorite" as const, l: "收藏" },
                { k: "search" as const, l: "搜索" },
                { k: "preference" as const, l: "偏好" },
              ]
            ).map(({ k, l }) => (
              <button
                key={k}
                onClick={() => {
                  // 简单的"突出此权重"：+10%，其他 -3.3% 平衡
                  const cur = weights[k] ?? 0;
                  const next: RecommendWeights = { ...weights };
                  next[k] = Math.min(0.7, cur + 0.1);
                  const remain = 1 - next[k];
                  const otherKeys = (["history", "favorite", "search", "preference"] as const).filter(
                    (x) => x !== k
                  );
                  const avg = remain / otherKeys.length;
                  otherKeys.forEach((x) => {
                    next[x] = Math.max(0.05, avg);
                  });
                  setRecommendWeights(next);
                }}
                className="px-2 py-1 rounded-full text-[10px] font-dm text-soft hover:text-primary transition-colors"
                style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
              >
                偏重 {l}
              </button>
            ))}
            <button
              onClick={() => setRecommendWeights(DEFAULT_RECOMMEND_WEIGHTS)}
              className="px-2 py-1 rounded-full text-[10px] font-dm text-soft hover:text-primary transition-colors"
              style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
            >
              恢复默认
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function DailyRecommendFullList() {
  const navigate = useNavigate();
  const dailyRecommend = usePlayerStore((s) => s.dailyRecommend);
  const dailyRecommendStatus = usePlayerStore((s) => s.dailyRecommendStatus);
  const dailyRecommendDate = usePlayerStore((s) => s.dailyRecommendDate);
  const fetchDailyRecommend = usePlayerStore((s) => s.fetchDailyRecommend);
  const addDailyRecommendToQueue = usePlayerStore((s) => s.addDailyRecommendToQueue);
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const songs = usePlayerStore((s) => s.songs);

  useEffect(() => {
    if (dailyRecommendStatus === "idle" || dailyRecommendDate !== formatDate(new Date())) {
      void fetchDailyRecommend();
    }
  }, [dailyRecommendStatus, dailyRecommendDate, fetchDailyRecommend]);

  const currentSong = songs[currentSongIndex];
  const isPlayingDaily = currentSong && dailyRecommend.some((s) => s.id === currentSong.id);

  const handlePlayAll = () => {
    if (dailyRecommend.length > 0) {
      usePlayerStore.getState().playDailyRecommendAt(0);
      navigate("/play");
    }
  };

  return (
    <section
      className="relative overflow-hidden rounded-card p-6 md:p-8 glass"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--card)) 0%, color-mix(in srgb, var(--accent-2) 6%, var(--card)) 100%)",
      }}
    >
      <div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: "var(--accent)" }}
      />

      <div className="relative">
        <p className="font-dm text-xs text-soft mb-1.5 flex items-center gap-1.5">
          <Sparkles size={12} style={{ color: "var(--accent)" }} />
          每日推荐 · {new Date().getMonth() + 1}月{new Date().getDate()}日
        </p>
        <h2 className="font-outfit font-bold text-2xl md:text-3xl text-primary leading-tight mb-1">
          为你精选 30 首心动旋律
        </h2>
        <p className="font-dm text-xs text-soft mb-4 max-w-2xl">
          基于播放历史 40% · 收藏 30% · 搜索 15% · 偏好 15% 智能排序
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <button
            onClick={handlePlayAll}
            disabled={dailyRecommend.length === 0}
            className="clickable-pill px-5 py-2 rounded-full text-sm font-dm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            {isPlaying && isPlayingDaily ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
            {isPlaying && isPlayingDaily ? "暂停" : "播放全部"}
          </button>
          <button
            onClick={addDailyRecommendToQueue}
            disabled={dailyRecommend.length === 0}
            className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-primary flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: "var(--card-soft)", border: "1px solid var(--border-strong)" }}
          >
            <ListPlus size={14} />
            全部加入待播放
          </button>
          <button
            onClick={() => void fetchDailyRecommend(true)}
            disabled={dailyRecommendStatus === "loading"}
            className="clickable-pill w-9 h-9 rounded-full flex items-center justify-center text-soft hover:text-primary"
            aria-label="刷新"
            title="刷新每日推荐"
          >
            {dailyRecommendStatus === "loading" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>
        </div>

        {dailyRecommend.length === 0 && dailyRecommendStatus === "loading" ? (
          <div className="text-center py-12">
            <Loader2
              size={32}
              className="mx-auto text-faint mb-3 animate-spin"
              style={{ color: "var(--accent)" }}
            />
            <p className="font-dm text-sm text-soft">正在为你生成今日推荐...</p>
          </div>
        ) : dailyRecommend.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-dm text-sm text-soft">暂无推荐，请先听几首歌或选择偏好</p>
          </div>
        ) : (
          <div className="card-surface p-2 md:p-3">
            <div className="space-y-0.5">
              {dailyRecommend.map((song: Song, i: number) => (
                <SongRow key={song.id} song={song} index={i} showRank rank={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FmFullSection() {
  const navigate = useNavigate();
  const fmStatus = usePlayerStore((s) => s.fmStatus);
  const fmCurrentReason = usePlayerStore((s) => s.fmCurrentReason);
  const fmPlayed = usePlayerStore((s) => s.fmPlayed);
  const fmQueue = usePlayerStore((s) => s.fmQueue);
  const startFm = usePlayerStore((s) => s.startFm);
  const fmNext = usePlayerStore((s) => s.fmNext);
  const fmDislikeCurrent = usePlayerStore((s) => s.fmDislikeCurrent);
  const fmRestart = usePlayerStore((s) => s.fmRestart);

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
      className="relative overflow-hidden rounded-card p-6 md:p-8 glass"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, #06b6d4 10%, var(--card)) 0%, color-mix(in srgb, var(--accent) 8%, var(--card)) 100%)",
      }}
    >
      <div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: "#06b6d4" }}
      />

      <div className="relative">
        <p className="font-dm text-xs text-soft mb-1.5 flex items-center gap-1.5">
          <Radio size={12} style={{ color: "#06b6d4" }} />
          私人 FM
        </p>
        <h2 className="font-outfit font-bold text-2xl md:text-3xl text-primary leading-tight mb-1">
          无限不重样的私人电台
        </h2>
        <p className="font-dm text-xs text-soft mb-5 max-w-2xl">
          实时算法推荐。点 ❤ 跳过不喜欢，自动播放下一首为你而选的歌。
        </p>

        {currentSong && fmStatus === "ready" ? (
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div
              className="w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden flex-shrink-0 mx-auto md:mx-0"
              style={{ boxShadow: "0 8px 30px -4px #06b6d4" }}
            >
              {currentSong.cover ? (
                <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #06b6d4, var(--accent))" }}
                >
                  <Music2 size={48} className="text-white/70" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 w-full">
              <p className="font-outfit font-bold text-xl text-primary truncate">{currentSong.title}</p>
              <p className="font-dm text-sm text-soft truncate mb-2">{currentSong.artist}</p>

              {fmCurrentReason && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-dm text-white mb-4"
                  style={{ background: "linear-gradient(135deg, #06b6d4, var(--accent))" }}
                >
                  <Sparkles size={10} />
                  {fmCurrentReason}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void fmDislikeCurrent()}
                  className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-soft hover:text-error flex items-center gap-1.5"
                  style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
                >
                  <Heart size={14} />
                  不喜欢
                </button>
                <button
                  onClick={() => void fmNext()}
                  className="clickable-pill px-5 py-2 rounded-full text-sm font-dm font-semibold text-white flex items-center gap-1.5"
                  style={{ background: "linear-gradient(135deg, #06b6d4, var(--accent))" }}
                >
                  <Play size={14} fill="white" />
                  下一首
                </button>
                <button
                  onClick={() => void fmRestart()}
                  className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-soft hover:text-primary flex items-center gap-1.5"
                  style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
                >
                  <RefreshCw size={14} />
                  重新开始
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-default">
                <p className="font-dm text-xs text-soft">
                  本次已播 <span className="text-primary font-semibold">{fmPlayed.length}</span> 首
                  {" · "}
                  队列 <span className="text-primary font-semibold">{fmQueue.length}</span> 首
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <button
              onClick={handleStart}
              disabled={fmStatus === "loading"}
              className="px-8 py-3 rounded-full text-base font-dm font-semibold text-white flex items-center gap-2 mx-auto disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #06b6d4, var(--accent))",
                boxShadow: "0 8px 24px -6px #06b6d4",
              }}
            >
              {fmStatus === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  正在调频
                </>
              ) : (
                <>
                  <Play size={16} fill="white" />
                  开启 FM
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function GuessFullGrid() {
  const guessPlaylists = usePlayerStore((s) => s.guessPlaylists);
  const guessStatus = usePlayerStore((s) => s.guessStatus);
  const guessHasMore = usePlayerStore((s) => s.guessHasMore);
  const fetchGuessYouLike = usePlayerStore((s) => s.fetchGuessYouLike);
  const loadMoreGuess = usePlayerStore((s) => s.loadMoreGuess);

  useEffect(() => {
    if (guessStatus === "idle" && guessPlaylists.length === 0) {
      void fetchGuessYouLike(true);
    }
  }, [guessStatus, guessPlaylists.length, fetchGuessYouLike]);

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-outfit font-bold text-2xl text-primary">猜你喜欢</h2>
          <p className="font-dm text-xs text-soft mt-1">
            协同过滤 + 内容推荐 · 已为你筛选 {guessPlaylists.length} 张
          </p>
        </div>
        <button
          onClick={() => void fetchGuessYouLike(true)}
          disabled={guessStatus === "loading"}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary flex items-center gap-1.5"
        >
          {guessStatus === "loading" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          换一批
        </button>
      </div>

      {guessPlaylists.length === 0 && guessStatus === "loading" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-card-soft animate-pulse" />
          ))}
        </div>
      ) : guessPlaylists.length === 0 ? (
        <div className="card-surface text-center py-12">
          <p className="font-dm text-sm text-soft">暂无推荐内容</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {guessPlaylists.map((item: RecommendPlaylist) => (
              <PlaylistCard key={item.id} item={item} />
            ))}
          </div>
          {guessHasMore && (
            <div className="text-center mt-6">
              <button
                onClick={() => void loadMoreGuess()}
                disabled={guessStatus === "loading"}
                className="clickable-pill px-6 py-2 rounded-full text-sm font-dm text-soft hover:text-primary flex items-center gap-1.5 mx-auto"
                style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
              >
                {guessStatus === "loading" ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    加载中
                  </>
                ) : (
                  <>加载更多</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function RecommendPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "0 4px 16px -4px var(--accent)",
          }}
        >
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="font-outfit font-bold text-xl text-primary mb-2">登录后即可查看个性化推荐</h2>
        <p className="font-dm text-sm text-soft mb-6">登录后显示30首推荐歌曲，为你量身打造</p>
        <button
          onClick={() => openAuthModal("login")}
          className="clickable-pill px-6 py-2.5 rounded-full text-sm font-dm font-semibold text-white flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "0 4px 16px -4px var(--accent)",
          }}
        >
          <LogIn size={16} />
          立即登录
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "0 4px 16px -4px var(--accent)",
          }}
        >
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-outfit font-bold text-2xl text-primary">个性推荐</h1>
          <p className="font-dm text-xs text-soft">为你量身打造的听歌体验</p>
        </div>
      </header>

      <DailyRecommendFullList />
      <FmFullSection />
      <PreferencesPanel />
      <GuessFullGrid />
    </div>
  );
}
