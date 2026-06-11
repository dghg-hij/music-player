import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import usePlayerStore from "./store/playerStore";
import useAuthStore from "./store/authStore";
import useAudioPlayer, { audioControls } from "./hooks/useAudioPlayer";
import TopNav from "./components/TopNav";
import MiniPlayer from "./components/MiniPlayer";
import GlobalToast from "./components/GlobalToast";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import LibraryPage from "./pages/LibraryPage";
import MyPage from "./pages/MyPage";
import PlayerPage from "./pages/PlayerPage";
import SearchPage from "./pages/SearchPage";
import { RankingListPage } from "./pages/RankingPage";
import RankingPage from "./pages/RankingPage";
import RecommendPage from "./pages/RecommendPage";
import { ArtistDetailPage, AlbumDetailPage, PlaylistDetailPage } from "./pages/DetailPages";
import MyPlaylistDetailPage from "./pages/MyPlaylistDetailPage";
import SettingsPage from "./pages/SettingsPage";
import NetworkStatus from "./components/NetworkStatus";
import OnboardingGuide from "./components/OnboardingGuide";

/** PRD 4.2 / 6.3：监听后端 API 401 未授权事件，自动弹出登录弹窗 */
function ApiUnauthorizedListener() {
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  useEffect(() => {
    const handler = () => {
      openAuthModal("login");
    };
    window.addEventListener("api:unauthorized", handler);
    return () => window.removeEventListener("api:unauthorized", handler);
  }, [openAuthModal]);
  return null;
}

/** PRD 评审纪要 C1：登录成功后拉取用户数据（歌单、收藏、设置、会员信息） */
function PostLoginDataFetcher() {
  useEffect(() => {
    const handler = () => {
      const state = usePlayerStore.getState();
      // 拉取每日推荐（需要登录态）
      state.fetchDailyRecommend(true);
      // 刷新热门歌曲
      state.fetchHotSongs(true);
    };
    window.addEventListener("auth:login", handler);
    return () => window.removeEventListener("auth:login", handler);
  }, []);
  return null;
}

/** PRD 6.1/6.2：监听 API 层 Toast 事件，转发到 playerStore（避免循环依赖） */
function ApiToastListener() {
  const showToast = usePlayerStore((s) => s.showToast);
  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      showToast(message, type);
    };
    window.addEventListener("api:toast", handler);
    return () => window.removeEventListener("api:toast", handler);
  }, [showToast]);
  return null;
}

function AudioController() {
  useAudioPlayer();

  // PRD 3.2.5 步骤 2 + 评审纪要 B3 修订：
  // 取消自动跳转播放页，改为 MiniPlayer 闪烁提示 + Toast「正在播放：xxx」
  const showToast = usePlayerStore((s) => s.showToast);
  const playTrigger = usePlayerStore((s) => s.playTrigger);
  const prevTriggerRef = useRef(playTrigger);
  const location = useLocation();
  const currentSong = usePlayerStore((s) => s.songs[s.currentSongIndex]);

  useEffect(() => {
    if (playTrigger > prevTriggerRef.current) {
      // 仅在非播放页时显示 Toast
      if (location.pathname !== "/play" && currentSong?.title) {
        showToast(`正在播放：${currentSong.title}`, "info");
      }
    }
    prevTriggerRef.current = playTrigger;
  }, [playTrigger, location.pathname, currentSong?.title, showToast]);

  return null;
}

function Initializer() {
  const fetchSongsFromApi = usePlayerStore((s) => s.fetchSongsFromApi);
  const fetchHotSongs = usePlayerStore((s) => s.fetchHotSongs);
  const initAuth = useAuthStore((s) => s.initAuth);
  useEffect(() => {
    initAuth();
    fetchSongsFromApi();
    fetchHotSongs();
    usePlayerStore.getState().refreshCacheUsage();
  }, [fetchSongsFromApi, fetchHotSongs, initAuth]);
  return null;
}

/** 模块 8 设置：启动自动播放恢复（autoPlay=true 时尝试恢复上次播放） */
function AutoPlayResume() {
  useEffect(() => {
    const handle = () => {
      const { autoPlay, recentPlays, playSongById, isPlaying, currentSongIndex, lastProgress } =
        usePlayerStore.getState();
      // 仅在自动播放开启、未在播放、有最近播放记录时尝试恢复
      if (!autoPlay) return;
      if (isPlaying) return;
      if (currentSongIndex < 0) return;
      const first = recentPlays[0];
      if (first) {
        // 浏览器 autoplay 策略要求用户曾经交互过，这里使用静音再恢复的小技巧
        try {
          const audio = new Audio();
          audio.muted = true;
          audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
            playSongById(first);
            // PRD 5.3 断点续播：恢复上次播放进度
            if (lastProgress > 0) {
              setTimeout(() => {
                const { duration } = usePlayerStore.getState();
                if (lastProgress < duration - 2) {
                  audioControls.seek(lastProgress);
                }
              }, 1000);
            }
          }).catch(() => {
            // 浏览器拒绝自动播放，提示用户手动点击
            usePlayerStore.getState().showToast("自动播放被浏览器阻止，请手动点击播放", "info");
          });
        } catch {
          playSongById(first);
        }
      }
    };
    // 首次加载延迟 1.2s 触发，避免与首次拉歌冲突
    const t = setTimeout(handle, 1200);
    return () => clearTimeout(t);
  }, []);
  return null;
}

/** 模块 8：监听系统主题变化，当设置为"跟随系统"时实时切换 */
function SystemThemeListener() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const { themePreference, setThemePreference } = usePlayerStore.getState();
      if (themePreference === "system") {
        // 重新触发 setThemePreference 让其重新读取系统主题
        setThemePreference("system");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename="/music-player">
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <AudioController />
        <Initializer />
        <SystemThemeListener />
        <AutoPlayResume />
        <ApiUnauthorizedListener />
        <ApiToastListener />
        <PostLoginDataFetcher />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 pb-32">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/category/:id" element={<CategoryPage />} />
            <Route path="/ranking" element={<RankingListPage />} />
            <Route path="/ranking/:id" element={<RankingPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/play" element={<PlayerPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/recommend" element={<RecommendPage />} />
            <Route path="/artist/:id" element={<ArtistDetailPage />} />
            <Route path="/album/:id" element={<AlbumDetailPage />} />
            <Route path="/playlist/:id" element={<PlaylistDetailPage />} />
            <Route path="/my/playlist/:id" element={<MyPlaylistDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <div className="text-center py-20">
                  <p className="font-dm text-soft">页面不存在</p>
                </div>
              }
            />
          </Routes>
        </main>

        <MiniPlayer />
        <NetworkStatus />
        <GlobalToast />
        <OnboardingGuide />
      </div>
    </BrowserRouter>
  );
}
