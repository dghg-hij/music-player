import { useRef, useEffect } from "react";
import type { LyricLine } from "../types";

interface LyricsProps {
  lyrics: LyricLine[];
  currentLyricIndex: number;
}

export default function Lyrics({ lyrics, currentLyricIndex }: LyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeLineRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const activeLine = activeLineRef.current;
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeLine.getBoundingClientRect();
    const scrollTarget =
      activeRect.top -
      containerRect.top -
      containerRect.height / 2 +
      activeRect.height / 2 +
      container.scrollTop;

    container.scrollTo({
      top: scrollTarget,
      behavior: "smooth",
    });
  }, [currentLyricIndex]);

  if (lyrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-dm text-sm text-white/30">暂无歌词</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-2 py-16 scrollbar-thin"
    >
      <div className="space-y-3">
        {lyrics.map((line, index) => {
          const isActive = index === currentLyricIndex;
          const isNear = Math.abs(index - currentLyricIndex) <= 2;
          return (
            <div
              key={`${index}-${line.time}`}
              ref={isActive ? activeLineRef : null}
              className={`transition-all duration-500 ease-out py-1 px-3 rounded-lg ${
                isActive
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-orange font-outfit font-semibold text-lg scale-105"
                  : isNear
                    ? "text-white/50 font-dm text-sm"
                    : "text-white/20 font-dm text-sm"
              }`}
              style={{
                transform: isActive ? "scale(1.05)" : "scale(1)",
                transformOrigin: "left center",
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
