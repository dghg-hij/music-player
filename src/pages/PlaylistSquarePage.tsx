import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ListMusic, ChevronRight } from "lucide-react";
import { PLAYLIST_ALBUMS } from "../services/musicApi";
import PullToRefresh from "../components/PullToRefresh";

export default function PlaylistSquarePage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6" key={refreshKey}>
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="clickable-pill w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "var(--card-soft)" }}
          title="返回"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-outfit font-bold text-2xl md:text-3xl text-primary">
            歌单广场
          </h1>
          <p className="font-dm text-xs text-soft mt-1">
            精选主题歌单 · 任你畅听
          </p>
        </div>
      </div>

      {/* 歌单专辑网格 */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {PLAYLIST_ALBUMS.map((p) => (
            <Link
              key={p.id}
              to={`/playlist-album/${p.id}`}
              className="group block clickable-ring"
              style={{ borderRadius: "1.25rem" }}
            >
              <div
                className="relative rounded-2xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]"
                style={{ boxShadow: `0 6px 20px -4px ${p.accent}55` }}
              >
                <div className="aspect-square">
                  <img
                    src={p.cover}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = "none";
                      if (t.parentElement)
                        t.parentElement.style.background = `linear-gradient(135deg, ${p.accent}, var(--accent-2))`;
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, transparent 30%, ${p.accent}cc 100%)`,
                    }}
                  />
                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                       style={{ background: "rgba(0,0,0,0.4)" }}>
                    <ListMusic size={14} className="text-white" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-outfit font-bold text-lg text-white leading-tight">
                      {p.name}
                    </h3>
                    <p className="font-dm text-xs text-white/85 mt-1 truncate">
                      {p.description}
                    </p>
                  </div>
                </div>
                {/* 底部条 */}
                <div
                  className="px-3 py-2 flex items-center justify-between"
                  style={{ background: `color-mix(in srgb, ${p.accent} 30%, var(--card))` }}
                >
                  <span className="font-dm text-[11px] text-white/90">
                    点击查看 30 首
                  </span>
                  <ChevronRight size={12} className="text-white/80" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
    </PullToRefresh>
  );
}
