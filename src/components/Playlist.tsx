import { useRef } from "react";
import type { Song } from "../types";
import { Plus, Heart, ListPlus } from "lucide-react";
import usePlayerStore from "../store/playerStore";

interface PlaylistProps {
  songs: Song[];
  currentIndex: number;
  onSelectSong: (index: number) => void;
  showFavorites: boolean;
}

function WaveIcon() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      <div className="w-[3px] bg-accent rounded-full animate-wave-1" />
      <div className="w-[3px] bg-accent rounded-full animate-wave-2" />
      <div className="w-[3px] bg-accent rounded-full animate-wave-3" />
      <div className="w-[3px] bg-accent-orange rounded-full animate-wave-4" />
    </div>
  );
}

export default function Playlist({
  songs,
  currentIndex,
  onSelectSong,
  showFavorites,
}: PlaylistProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importLocalFiles = usePlayerStore((s) => s.importLocalFiles);
  const toggleShowFavorites = usePlayerStore((s) => s.toggleShowFavorites);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      importLocalFiles(e.target.files);
      e.target.value = "";
    }
  };

  const displaySongs = showFavorites
    ? songs.filter((s) => s.isFavorite)
    : songs;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-outfit font-semibold text-lg text-white">
            {showFavorites ? "我喜欢的" : "播放列表"}
          </h3>
          <button
            onClick={toggleShowFavorites}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              showFavorites
                ? "text-red-500 bg-red-500/10"
                : "text-white/20 hover:text-red-400 hover:bg-white/5"
            }`}
            aria-label={showFavorites ? "显示全部" : "显示我喜欢的"}
            title={showFavorites ? "显示全部" : "我喜欢的"}
          >
            <Heart
              size={14}
              strokeWidth={2}
              fill={showFavorites ? "currentColor" : "none"}
            />
          </button>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-accent hover:bg-accent/10 transition-all duration-200"
          aria-label="导入本地音乐"
          title="导入本地音乐"
        >
          <Plus size={18} strokeWidth={2} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {displaySongs.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="font-dm text-sm text-white/30">
              {showFavorites ? "还没有收藏歌曲" : "播放列表为空"}
            </p>
          </div>
        ) : (
          displaySongs.map((song) => {
            const originalIndex = songs.indexOf(song);
            const isActive = originalIndex === currentIndex;
            return (
              <div
                key={song.id}
                onClick={() => onSelectSong(originalIndex)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative overflow-hidden cursor-pointer ${
                  isActive
                    ? "bg-accent/15 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-6 text-center flex-shrink-0">
                  {isActive ? (
                    <WaveIcon />
                  ) : (
                    <span className="font-dm text-xs">{originalIndex + 1}</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-outfit text-sm truncate ${
                      isActive ? "font-semibold" : "font-normal"
                    }`}
                  >
                    {song.title}
                  </p>
                  <p className="font-dm text-xs text-white/40 truncate">
                    {song.artist}
                  </p>
                </div>
                {song.isFavorite && (
                  <Heart
                    size={12}
                    className="text-red-500/60 flex-shrink-0"
                    fill="currentColor"
                  />
                )}
                {!isActive && (
                  <button
                    onClick={(e) => { e.stopPropagation(); addToQueue(song); }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-accent hover:bg-accent/10 transition-all duration-200 flex-shrink-0"
                    aria-label="加入待播放"
                    title="加入待播放"
                  >
                    <ListPlus size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
