import { useRef } from "react";
import { Plus, Music2, Heart } from "lucide-react";
import usePlayerStore from "../store/playerStore";
import SongRow from "../components/SongRow";
import BatchActions from "../components/BatchActions";

export default function LibraryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const songs = usePlayerStore((s) => s.songs);
  const showFavorites = usePlayerStore((s) => s.showFavorites);
  const toggleShowFavorites = usePlayerStore((s) => s.toggleShowFavorites);
  const importLocalFiles = usePlayerStore((s) => s.importLocalFiles);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      importLocalFiles(e.target.files);
      e.target.value = "";
    }
  };

  const localSongs = songs.filter((s) => s.title);
  const displayList = showFavorites
    ? localSongs.filter((s) => s.isFavorite)
    : localSongs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit font-bold text-3xl text-primary">曲库</h1>
        <p className="font-dm text-sm text-soft mt-1">
          浏览所有歌曲，或导入本地音乐
        </p>
      </div>

      <div className="card-surface p-1.5 sm:p-3 md:p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleShowFavorites}
            className="clickable-pill px-3 py-2 rounded-full text-xs font-dm flex items-center gap-1.5"
            style={
              showFavorites
                ? { background: "color-mix(in srgb, #ef4444 18%, transparent)", color: "#ef4444" }
                : { background: "var(--card-soft)", color: "var(--text-soft)" }
            }
            title={showFavorites ? "显示全部" : "只显示我喜欢"}
          >
            <Heart size={12} fill={showFavorites ? "currentColor" : "none"} />
            我喜欢
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="clickable-pill px-3 py-2 rounded-full text-xs font-dm flex items-center gap-1.5 text-white"
            style={{ background: "var(--accent)" }}
            title="导入本地音乐"
          >
            <Plus size={12} /> 导入本地
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

        <div className="flex items-center justify-between px-1">
          <p className="font-dm text-xs text-soft">
            {showFavorites
              ? `我喜欢 · ${displayList.length} 首`
              : `全部歌曲 · ${displayList.length} 首`}
          </p>
        </div>

        {displayList.length > 0 && <BatchActions songs={displayList} />}

        {displayList.length === 0 ? (
          <div className="text-center py-12">
            <Music2 size={36} className="mx-auto text-faint mb-3" />
            <p className="font-dm text-sm text-soft">
              {showFavorites ? "还没有喜欢的歌曲" : "曲库为空"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayList.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} showPlaylistMenu />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
