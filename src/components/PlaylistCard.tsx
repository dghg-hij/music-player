import { Play, Headphones, Music2, Sparkles, Disc3 } from "lucide-react";
import type { RecommendPlaylist } from "../types";

interface PlaylistCardProps {
  item: RecommendPlaylist;
  onPlay?: (item: RecommendPlaylist) => void;
  size?: "sm" | "md" | "lg";
}

function formatPlayCount(n?: number): string {
  if (!n) return "0";
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

export default function PlaylistCard({ item, onPlay, size = "md" }: PlaylistCardProps) {
  const coverSize = size === "sm" ? "aspect-square" : size === "lg" ? "aspect-square" : "aspect-square";
  const titleSize = size === "sm" ? "text-sm" : "text-base";

  const Icon = item.type === "album" ? Disc3 : Music2;

  return (
    <div className="group block clickable-ring" style={{ borderRadius: "1.25rem" }}>
      <div
        className={`relative ${coverSize} rounded-2xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]`}
        style={{ boxShadow: `0 6px 20px -4px ${item.accent}55` }}
      >
        <img
          src={item.cover}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            if (t.parentElement) {
              t.parentElement.style.background = `linear-gradient(135deg, ${item.accent}, var(--accent-2))`;
            }
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 40%, ${item.accent}cc 100%)`,
          }}
        />

        {/* 类型标签 */}
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-dm font-semibold text-white"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
        >
          <Icon size={10} />
          <span>{item.type === "album" ? "专辑" : "歌单"}</span>
        </div>

        {/* 推荐原因 */}
        {item.reason && (
          <div
            className="absolute top-2 right-2 max-w-[60%] flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-dm text-white truncate"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
            title={item.reason}
          >
            <Sparkles size={10} />
            <span className="truncate">{item.reason}</span>
          </div>
        )}

        {/* 底部信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className={`font-outfit font-bold text-white leading-tight ${titleSize}`}>
            {item.name}
          </h3>
          {item.creator && (
            <p className="font-dm text-[11px] text-white/85 mt-0.5 truncate">{item.creator}</p>
          )}
        </div>

        {/* Hover 播放按钮 */}
        {onPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: `0 4px 14px -2px ${item.accent}aa`,
            }}
            aria-label={`播放 ${item.name}`}
          >
            <Play size={16} fill="white" className="ml-0.5" />
          </button>
        )}
      </div>

      <div className="mt-2 px-1">
        {item.description && (
          <p className="font-dm text-xs text-soft truncate">{item.description}</p>
        )}
        {item.playCount !== undefined && item.playCount > 0 && (
          <p className="font-dm text-[11px] text-faint mt-0.5 flex items-center gap-1">
            <Headphones size={10} />
            {formatPlayCount(item.playCount)} 播放
            {item.songCount !== undefined && ` · ${item.songCount} 首`}
          </p>
        )}
      </div>
    </div>
  );
}
