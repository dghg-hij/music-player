import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import usePlayerStore from "./store/playerStore";
import useAudioPlayer from "./hooks/useAudioPlayer";
import TopNav from "./components/TopNav";
import MiniPlayer from "./components/MiniPlayer";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import LibraryPage from "./pages/LibraryPage";
import MyPage from "./pages/MyPage";
import PlayerPage from "./pages/PlayerPage";
import { RankingListPage } from "./pages/RankingPage";
import RankingPage from "./pages/RankingPage";

function AudioController() {
  useAudioPlayer();
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
