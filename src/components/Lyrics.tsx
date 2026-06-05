import { useRef, useEffect, useMemo } from "react";
import type { LyricLine } from "../types";

interface LyricsProps {
  lyrics: LyricLine[];
  currentLyricIndex: number;
}

export default function Lyrics({ lyrics, currentLyricIndex }: LyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // 使用 CSS transform 实现平滑滚动，避免 scrollTo 的卡顿
  useEffect(() => {
    if (!innerRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const inner = innerRef.current;
    // 每行高度约 36px (py-1 + text)，计算当前行偏移
    const lineHeight = 36;
    const targetOffset = currentLyricIndex * lineHeight;
    const containerHeight = container.clientHeight;
    const scrollTarget = targetOffset - containerHeight / 2 + lineHeight / 2;
    inner.style.transform = `translateY(${-scrollTarget}px)`;
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
      className="h-full overflow-hidden px-2 py-16"
    >
      <div
        ref={innerRef}
        className="space-y-3 transition-transform duration-300 ease-out"
      >
        {lyrics.map((line, index) => {
          const isActive = index === currentLyricIndex;
          const isNear = Math.abs(index - currentLyricIndex) <= 2;
          return (
            <div
              key={`${index}-${line.time}`}
              className={`transition-all duration-300 ease-out py-1 px-3 rounded-lg ${
                isActive
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-orange font-outfit font-semibold text-lg"
                  : isNear
                    ? "text-white/50 font-dm text-sm"
                    : "text-white/20 font-dm text-sm"
              }`}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
