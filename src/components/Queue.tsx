import { ListOrdered, X, Play, Trash2 } from "lucide-react";
import usePlayerStore from "../store/playerStore";

export default function Queue() {
  const queue = usePlayerStore((s) => s.queue);
  const playFromQueue = usePlayerStore((s) => s.playFromQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <ListOrdered size={16} className="text-accent" />
          <h3 className="font-outfit font-semibold text-lg text-white">
            待播放
          </h3>
          {queue.length > 0 && (
            <span className="font-dm text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
              {queue.length}
            </span>
          )}
        </div>
        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            className="text-white/30 hover:text-red-400 transition-colors duration-200 flex items-center gap-1"
            aria-label="清空待播放"
            title="清空待播放"
          >
            <Trash2 size={14} />
            <span className="font-dm text-xs">清空</span>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <ListOrdered size={24} className="text-white/10" />
            <p className="font-dm text-sm text-white/30">待播放列表为空</p>
            <p className="font-dm text-xs text-white/20">
              点击歌曲旁的 + 添加到待播放
            </p>
          </div>
        ) : (
          queue.map((song, index) => (
            <div
              key={song.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group text-white/60 hover:bg-white/5 hover:text-white"
            >
              <span className="w-6 text-center flex-shrink-0 font-dm text-xs text-white/25">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-outfit text-sm truncate">{song.title}</p>
                <p className="font-dm text-xs text-white/40 truncate">
                  {song.artist}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => playFromQueue(song.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-accent hover:bg-accent/10 transition-all duration-200"
                  aria-label="立即播放"
                  title="立即播放"
                >
                  <Play size={14} fill="currentColor" />
                </button>
                <button
                  onClick={() => removeFromQueue(song.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  aria-label="移除"
                  title="移除"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
