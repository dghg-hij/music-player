import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import usePlayerStore from "./store/playerStore";
import useAudioPlayer from "./hooks/useAudioPlayer";
import TopNav from "./components/TopNav";
import MiniPlayer from "./components/MiniPlayer";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import LibraryPage from "./pages/LibraryPage";
import MyPage from "./pages/MyPage";
import PlayerPage from "./pages/PlayerPage";
import SearchPage from "./pages/SearchPage";
import { RankingListPage } from "./pages/RankingPage";
import RankingPage from "./pages/RankingPage";

function AudioController() {
  useAudioPlayer();

  // 歌曲播放结束后自动跳转到播放页
  const navigate = useNavigate();
  const location = useLocation();
  const playTrigger = usePlayerStore((s) => s.playTrigger);
  const prevTriggerRef = useRef(playTrigger);

  useEffect(() => {
    if (playTrigger > prevTriggerRef.current && location.pathname !== "/play") {
      navigate("/play");
    }
    prevTriggerRef.current = playTrigger;
  }, [playTrigger, navigate, location.pathname]);

  return null;
}

function Initializer() {
  const fetchSongsFromApi = usePlayerStore((s) => s.fetchSongsFromApi);
  const fetchHotSongs = usePlayerStore((s) => s.fetchHotSongs);
  useEffect(() => {
    fetchSongsFromApi();
    fetchHotSongs();
  }, [fetchSongsFromApi, fetchHotSongs]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename="/music-player">
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <AudioController />
        <Initializer />

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
      </div>
    </BrowserRouter>
  );
}
