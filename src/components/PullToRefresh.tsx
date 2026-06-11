import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  /** 刷新时长（毫秒），默认 500 */
  duration?: number;
}

export default function PullToRefresh({ children, onRefresh, duration = 500 }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start pulling if scrolled to top
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Resistance effect - the further you pull, the harder it gets
      const distance = Math.min(diff * 0.5, 100);
      setPullDistance(distance);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    pulling.current = false;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        // Ensure minimum duration of 500ms
        setTimeout(() => {
          setRefreshing(false);
        }, duration);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh, duration]);

  // Also support mouse wheel / scroll for desktop
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollTop <= 0 && e.deltaY < 0 && !refreshing) {
        setRefreshing(true);
        (async () => {
          try {
            await onRefresh();
          } finally {
            setTimeout(() => {
              setRefreshing(false);
            }, duration);
          }
        })();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: true });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [refreshing, onRefresh, duration]);

  return (
    <div
      ref={containerRef}
      className="pull-to-refresh-container"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        height: "100%",
        WebkitOverflowScrolling: "touch",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh indicator */}
      <div
        style={{
          height: refreshing ? 40 : pullDistance,
          transition: refreshing ? "none" : "height 0.2s ease",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RefreshCw
          size={18}
          className={refreshing ? "animate-spin" : ""}
          style={{ color: "var(--accent)", opacity: refreshing || pullDistance > 10 ? 1 : 0, transition: "opacity 0.2s" }}
        />
        {refreshing && (
          <span className="ml-2 font-dm text-xs text-soft">刷新中...</span>
        )}
      </div>
      {children}
    </div>
  );
}
