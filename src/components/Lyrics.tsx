import { useRef, useEffect, useCallback, useState } from "react";
import type { LyricLine } from "../types";

interface LyricsProps {
  lyrics: LyricLine[];
  currentLyricIndex: number;
}

export default function Lyrics({ lyrics, currentLyricIndex }: LyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isAutoScrollingRef = useRef(false);

  const setLineRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    lineRefs.current[index] = el;
  }, []);

  // 检测用户手动滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // 如果是自动滚动触发的，忽略
      if (isAutoScrollingRef.current) {
        isAutoScrollingRef.current = false;
        return;
      }
      // 用户手动滚动
      setIsUserScrolling(true);
      if (userScrollTimerRef.current) {
        clearTimeout(userScrollTimerRef.current);
      }
      // 3秒后恢复自动滚动
      userScrollTimerRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 3000);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (userScrollTimerRef.current) {
        clearTimeout(userScrollTimerRef.current);
      }
    };
  }, []);

  // 自动滚动到当前歌词行
  useEffect(() => {
    if (currentLyricIndex < 0 || !containerRef.current) return;
    // 用户正在手动滚动时，不自动滚动
    if (isUserScrolling) return;

    const lineEl = lineRefs.current[currentLyricIndex];
    if (!lineEl) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;
    const lineTop = lineEl.offsetTop;
    const lineHeight = lineEl.offsetHeight;
    const scrollTarget = lineTop - containerHeight / 2 + lineHeight / 2;

    isAutoScrollingRef.current = true;
    container.scrollTo({
      top: Math.max(0, scrollTarget),
      behavior: "smooth",
    });
  }, [currentLyricIndex, isUserScrolling]);

  if (lyrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-dm text-sm text-soft">暂无歌词</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-2 py-4 scroll-smooth"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* 顶部留白，让第一行能居中 */}
      <div style={{ height: "40%" }} />
      {lyrics.map((line, index) => {
        const isActive = index === currentLyricIndex;
        const isNear = Math.abs(index - currentLyricIndex) <= 2;
        return (
          <div
            key={`${index}-${line.time}`}
            ref={setLineRef(index)}
            className={`transition-all duration-300 ease-out py-2.5 px-3 rounded-lg cursor-default ${
              isActive
                ? "font-outfit font-semibold text-lg"
                : isNear
                  ? "font-dm text-sm"
                  : "font-dm text-sm"
            }`}
            style={{
              color: isActive
                ? "var(--accent)"
                : isNear
                  ? "var(--text-soft)"
                  : "var(--text-faint)",
            }}
          >
            {line.text}
          </div>
        );
      })}
      {/* 底部留白，让最后一行能居中 */}
      <div style={{ height: "40%" }} />
    </div>
  );
}
