import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Mic2,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from "lucide-react";
import { getHotArtists, type HotArtist } from "../services/musicApi";
import PullToRefresh from "../components/PullToRefresh";

function formatHeat(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + "亿";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toString();
}

function TrendBadge({ trend }: { trend: HotArtist["weeklyTrend"] }) {
  if (trend === "up") {
    return (
      <span
        className="inline-flex items-center gap-0.5 font-dm text-[10px] font-semibold"
        style={{ color: "#10B981" }}
      >
        <TrendingUp size={10} /> 升
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span
        className="inline-flex items-center gap-0.5 font-dm text-[10px] font-semibold"
        style={{ color: "#EF4444" }}
      >
        <TrendingDown size={10} /> 降
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 font-dm text-[10px] font-semibold"
      style={{ color: "var(--text-soft)" }}
    >
      <Minus size={10} /> 持平
    </span>
  );
}

export default function HotArtistsPage() {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<HotArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await getHotArtists(10);
      if (cancelled) return;
      setArtists(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6" key={refreshKey}>
      {/* 头部 */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-8"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, #0EA5E9 18%, var(--card)) 0%, color-mix(in srgb, #A855F7 12%, var(--card)) 100%)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "#0EA5E9" }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "#A855F7" }}
        />
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 font-dm text-xs text-soft hover:text-primary transition-colors clickable-pill px-3 py-1.5 mb-4"
        >
          <ArrowLeft size={14} /> 返回
        </button>
        <div className="relative flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #0EA5E9, #A855F7)",
              boxShadow: "0 4px 16px -4px #0EA5E999",
            }}
          >
            <Mic2 size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-outfit font-bold text-2xl md:text-3xl text-primary">
              本周最热歌手
            </h1>
            <p className="font-dm text-xs text-soft mt-1 flex items-center gap-1.5">
              <Flame size={12} style={{ color: "var(--accent-2)" }} />
              每周一更新 · 收录本周播放/收藏热度最高的 10 位歌手
            </p>
          </div>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2
            className="w-7 h-7 animate-spin"
            style={{ color: "var(--accent)" }}
          />
          <p className="font-dm text-sm text-soft">
            正在拉取本周最热歌手...
          </p>
        </div>
      ) : artists.length === 0 ? (
        <div className="text-center py-16">
          <Mic2 size={36} className="mx-auto text-faint mb-3" />
          <p className="font-dm text-sm text-soft">
            暂无本周热门歌手数据
          </p>
        </div>
      ) : (
        <div className="card-surface p-2 md:p-3 space-y-1">
          {artists.map((item) => {
            const isTop3 = item.rank <= 3;
            return (
              <Link
                key={item.artist.id}
                to={`/artist/${item.artist.id}`}
                className="group flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-2xl transition-all duration-200 hover:scale-[1.005]"
                style={{
                  background: isTop3
                    ? "color-mix(in srgb, var(--accent-2) 6%, var(--card-soft))"
                    : "var(--card-soft)",
                  border: isTop3
                    ? "1px solid color-mix(in srgb, var(--accent-2) 28%, var(--border))"
                    : "1px solid transparent",
                }}
              >
                {/* 名次 */}
                <span
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-outfit font-bold text-sm flex-shrink-0"
                  style={
                    isTop3
                      ? {
                          background:
                            "linear-gradient(135deg, #FB923C, #EF4444)",
                          color: "white",
                          boxShadow: "0 2px 10px -2px #EF444480",
                        }
                      : {
                          background: "var(--card)",
                          color: "var(--text-soft)",
                          border: "1px solid var(--border)",
                        }
                  }
                >
                  {item.rank}
                </span>

                {/* 头像 */}
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex-shrink-0"
                  style={{
                    boxShadow: isTop3
                      ? "0 0 14px -2px #FB923C99"
                      : "0 0 8px -2px var(--accent-2)55",
                    background:
                      "linear-gradient(135deg, #0EA5E9, #A855F7)",
                  }}
                >
                  <img
                    src={item.artist.avatar}
                    alt={item.artist.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = "none";
                    }}
                  />
                </div>

                {/* 名字 + 元信息 */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-outfit font-semibold text-base text-primary truncate">
                    {item.artist.name}
                  </h3>
                  <p className="font-dm text-[11px] text-soft truncate">
                    {item.artist.songCount} 首歌曲 ·{" "}
                    {item.artist.albumCount} 张专辑
                  </p>
                </div>

                {/* 周热度 + 趋势 */}
                <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                  <div className="flex items-center gap-1">
                    <TrendBadge trend={item.weeklyTrend} />
                    <span className="font-dm text-[10px] text-faint">
                      本周热度
                    </span>
                  </div>
                  <p
                    className="font-outfit font-bold text-sm"
                    style={{
                      color: isTop3 ? "var(--accent-2)" : "var(--primary)",
                    }}
                  >
                    {formatHeat(item.weeklyHeat)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 底部说明 */}
      {!loading && artists.length > 0 && (
        <p className="font-dm text-[11px] text-faint text-center">
          点击歌手进入其详情页，查看演唱 / 合作的所有歌曲
        </p>
      )}
    </div>
    </PullToRefresh>
  );
}
