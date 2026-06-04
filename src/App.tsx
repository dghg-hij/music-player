import { useEffect } from "react";
import SongInfo from "./components/SongInfo";
import ProgressBar from "./components/ProgressBar";
import Controls from "./components/Controls";
import VolumeControl from "./components/VolumeControl";
import Playlist from "./components/Playlist";
import Lyrics from "./components/Lyrics";
import SearchBar from "./components/SearchBar";
import HotChart from "./components/HotChart";
import ThemePicker from "./components/ThemePicker";
import Queue from "./components/Queue";
import usePlayerStore from "./store/playerStore";
import useAudioPlayer from "./hooks/useAudioPlayer";
import { getThemeColors } from "./components/ThemePicker";
import { Loader2, ListMusic, Mic2, Flame, Palette, X, ListOrdered, ListPlus } from "lucide-react";
import type { Song } from "./types";

function SearchResultsList({
  results,
  onPlay,
}: {
  results: Song[];
  onPlay: (song: Song) => void;
}) {
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="font-dm text-sm text-white/30">未找到相关歌曲</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-outfit font-semibold text-lg text-white mb-4 px-1">
        搜索结果
      </h3>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {results.map((song, index) => (
          <div
            key={`${song.neteaseId}-${index}`}
            onClick={() => onPlay(song)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 text-white/60 hover:bg-white/5 hover:text-white group cursor-pointer"
          >
            {song.cover ? (
              <img
                src={song.cover}
                alt=""
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #A855F7, #F97316)",
                }}
              >
                <span className="text-white/50 text-xs">♪</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-outfit text-sm truncate">{song.title}</p>
              <p className="font-dm text-xs text-white/40 truncate">
                {song.artist}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); addToQueue(song); }}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-accent hover:bg-accent/10 transition-all duration-200 flex-shrink-0"
              aria-label="加入待播放"
              title="加入待播放"
            >
              <ListPlus size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const songs = usePlayerStore((s) => s.songs);
  const isLoadingSongs = usePlayerStore((s) => s.isLoadingSongs);
  const lyrics = usePlayerStore((s) => s.lyrics);
  const currentLyricIndex = usePlayerStore((s) => s.currentLyricIndex);
  const showLyrics = usePlayerStore((s) => s.showLyrics);
  const searchResults = usePlayerStore((s) => s.searchResults);
  const isSearchMode = usePlayerStore((s) => s.isSearchMode);
  const playMode = usePlayerStore((s) => s.playMode);
  const showFavorites = usePlayerStore((s) => s.showFavorites);
  const showHotChart = usePlayerStore((s) => s.showHotChart);
  const theme = usePlayerStore((s) => s.theme);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const selectSong = usePlayerStore((s) => s.selectSong);
  const fetchSongsFromApi = usePlayerStore((s) => s.fetchSongsFromApi);
  const toggleShowLyrics = usePlayerStore((s) => s.toggleShowLyrics);
  const setSearchResults = usePlayerStore((s) => s.setSearchResults);
  const clearSearch = usePlayerStore((s) => s.clearSearch);
  const playSearchResult = usePlayerStore((s) => s.playSearchResult);
  const togglePlayMode = usePlayerStore((s) => s.togglePlayMode);
  const toggleFavorite = usePlayerStore((s) => s.toggleFavorite);
  const toggleShowHotChart = usePlayerStore((s) => s.toggleShowHotChart);
  const showQueue = usePlayerStore((s) => s.showQueue);
  const toggleShowQueue = usePlayerStore((s) => s.toggleShowQueue);
  const queue = usePlayerStore((s) => s.queue);

  const { togglePlay, seek, changeVolume } = useAudioPlayer();

  const currentSong = songs[currentSongIndex];
  const { primary, secondary } = getThemeColors(theme);

  useEffect(() => {
    fetchSongsFromApi();
  }, [fetchSongsFromApi]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
        {/* 左侧主面板 */}
        <div
          className="flex-1 rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6"
          style={{
            background: "rgba(26, 26, 46, 0.8)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${primary}15`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 60px ${primary}10, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
          }}
        >
          {isLoadingSongs ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
              <p className="font-dm text-sm text-white/60">
                正在加载歌曲信息...
              </p>
            </div>
          ) : (
            <>
              {currentSong && <SongInfo song={currentSong} />}

              {currentSong?.isLoading && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span className="font-dm text-xs text-white/40">
                    正在获取播放链接...
                  </span>
                </div>
              )}

              <div className="w-full max-w-sm">
                <ProgressBar
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={seek}
                />
              </div>

              <Controls
                isPlaying={isPlaying}
                isFavorite={currentSong?.isFavorite || false}
                playMode={playMode}
                onPlayPause={togglePlay}
                onPrev={playPrev}
                onNext={playNext}
                onToggleFavorite={() => toggleFavorite(currentSongIndex)}
                onTogglePlayMode={togglePlayMode}
              />

              <VolumeControl volume={volume} onVolumeChange={changeVolume} />
            </>
          )}
        </div>

        {/* 右侧面板 */}
        <div
          className="lg:w-80 xl:w-96 rounded-3xl p-6 md:p-8 min-h-[300px] lg:min-h-0 relative flex flex-col"
          style={{
            background: "rgba(26, 26, 46, 0.8)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${primary}15`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 60px ${primary}10, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
          }}
        >
          <div className="mb-3">
            <SearchBar
              onSearchResult={setSearchResults}
              onClearSearch={clearSearch}
              isSearching={false}
            />
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={toggleShowQueue}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 relative ${
                showQueue
                  ? "bg-accent/20 text-accent"
                  : "text-white/30 hover:text-accent hover:bg-white/5"
              }`}
              aria-label="待播放列表"
              title="待播放列表"
            >
              <ListOrdered size={16} />
              {queue.length > 0 && !showQueue && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-[10px] text-white flex items-center justify-center font-dm">
                  {queue.length > 9 ? "9+" : queue.length}
                </span>
              )}
            </button>
            <button
              onClick={toggleShowHotChart}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                showHotChart
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-white/30 hover:text-orange-400 hover:bg-white/5"
              }`}
              aria-label="热度排行榜"
              title="热度排行榜"
            >
              <Flame size={16} />
            </button>
            <button
              onClick={toggleShowLyrics}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                showLyrics
                  ? `bg-[${primary}]/20 text-[${primary}]`
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              }`}
              aria-label="切换歌词/列表"
            >
              {showLyrics ? <ListMusic size={16} /> : <Mic2 size={16} />}
            </button>
          </div>

          <div className="flex-1 min-h-0">
            {isSearchMode ? (
              <SearchResultsList
                results={searchResults}
                onPlay={playSearchResult}
              />
            ) : showQueue ? (
              <Queue />
            ) : showHotChart ? (
              <HotChart />
            ) : showLyrics ? (
              <Lyrics lyrics={lyrics} currentLyricIndex={currentLyricIndex} />
            ) : (
              <Playlist
                songs={songs}
                currentIndex={currentSongIndex}
                onSelectSong={selectSong}
                showFavorites={showFavorites}
              />
            )}
          </div>

          {/* 主题选择器 */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <ThemePicker />
          </div>
        </div>
      </div>
    </div>
  );
}
