import { Flame, Loader2, TrendingUp, ListPlus, Play, Pause } from "lucide-react";
import usePlayerStore from "../store/playerStore";
import { audioControls } from "../hooks/useAudioPlayer";

function formatHeat(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toString();
}

function getRankStyle(index: number) {
  if (index === 0) return "bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-bold";
  if (index === 1) return "bg-gradient-to-r from-gray-300 to-gray-400 text-black font-bold";
  if (index === 2) return "bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold";
  return "bg-white/10 text-white/50";
}

export default function HotChart() {
  const hotSongs = usePlayerStore((s) => s.hotSongs);
  const isLoadingHot = usePlayerStore((s) => s.isLoadingHot);
  const playHotSong = usePlayerStore((s) => s.playHotSong);
  const fetchHotSongs = usePlayerStore((s) => s.fetchHotSongs);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const isCurrentSong = (id: number) => {
    const idx = usePlayerStore.getState().songs.findIndex((s) => s.id === id);
    return idx === currentSongIndex;
  };

  const handlePlayClick = (e: React.MouseEvent, song: import("../types").Song) => {
    e.stopPropagation();
    if (isCurrentSong(song.id)) {
      audioControls.togglePlay();
      return;
    }
    playHotSong(song);
  };

  if (isLoadingHot) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
        <p className="font-dm text-sm text-white/40">加载排行榜中...</p>
      </div>
    );
  }

  if (hotSongs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="font-dm text-sm text-white/40">暂无排行数据</p>
        <button
          onClick={() => fetchHotSongs()}
          className="px-4 py-2 rounded-xl bg-accent/20 text-accent text-sm font-dm hover:bg-accent/30 transition-colors"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Flame size={18} className="text-orange-400" />
        <h3 className="font-outfit font-semibold text-lg text-white">
          每周热歌榜
        </h3>
        <span className="font-dm text-[10px] text-white/25 ml-auto flex items-center gap-1">
          <TrendingUp size={10} /> 每周更新
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {hotSongs.map((song, index) => {
          const isCurrent = isCurrentSong(song.id);
          return (
            <div
              key={song.id}
              onClick={() => playHotSong(song)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 text-white/60 hover:bg-white/5 hover:text-white group cursor-pointer"
            >
              <span
                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0 ${getRankStyle(index)}`}
              >
                {index + 1}
              </span>
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
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => handlePlayClick(e, song)}
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isCurrent
                      ? "text-accent opacity-100"
                      : "text-white/30 hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100"
                  }`}
                  aria-label={isCurrent && isPlaying ? "暂停" : "播放"}
                  title={isCurrent && isPlaying ? "暂停" : "播放"}
                >
                  {isCurrent && isPlaying ? (
                    <Pause size={14} fill="currentColor" />
                  ) : (
                    <Play size={14} fill="currentColor" />
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); addToQueue(song); }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-accent hover:bg-accent/10 transition-all duration-200"
                  aria-label="加入待播放"
                  title="加入待播放"
                >
                  <ListPlus size={14} />
                </button>
                <div className="flex items-center gap-1">
                  <Flame size={10} className="text-orange-400/60" />
                  <span className="font-dm text-[10px] text-orange-400/80">
                    {formatHeat(song.heat || 0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
