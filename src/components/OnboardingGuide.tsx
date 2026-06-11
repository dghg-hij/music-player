import { useState, useEffect } from "react";
import { X, Music2, Search, Heart, ListMusic, Settings } from "lucide-react";
import usePlayerStore from "../store/playerStore";

const ONBOARDING_KEY = "music-player-onboarding-done";

/**
 * PRD 5.4 用户体验：首次使用引导
 * - 首次打开应用时显示引导弹窗
 * - 介绍核心功能：搜索、播放、收藏、歌单
 * - 点击关闭后不再显示
 */
export default function OnboardingGuide() {
  const [show, setShow] = useState(false);
  const showToast = usePlayerStore((s) => s.showToast);

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        // 延迟 2 秒显示，避免与首屏加载冲突
        const t = setTimeout(() => setShow(true), 2000);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      // ignore
    }
    showToast("欢迎使用聆音，开始探索音乐吧！", "success");
  };

  if (!show) return null;

  const features = [
    { icon: Search, title: "搜索发现", desc: "输入歌手或歌曲名，快速找到想听的音乐" },
    { icon: Music2, title: "沉浸播放", desc: "高品质音乐播放，支持歌词同步、音质切换" },
    { icon: Heart, title: "收藏喜欢", desc: "一键收藏喜欢的歌曲，随时回味" },
    { icon: ListMusic, title: "歌单管理", desc: "创建专属歌单，按心情分类你的音乐" },
    { icon: Settings, title: "个性设置", desc: "主题切换、播放速度、音质偏好，定制你的体验" },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, black 60%, transparent)" }}
      onClick={handleClose}
    >
      <div
        className="card-surface w-full max-w-md p-6 glass-strong animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
            >
              <Music2 size={16} className="text-white" />
            </div>
            <h2 className="font-outfit font-bold text-lg text-primary">欢迎使用聆音</h2>
          </div>
          <button
            onClick={handleClose}
            className="song-row-action"
            style={{ width: "28px", height: "28px" }}
            aria-label="关闭引导"
          >
            <X size={14} />
          </button>
        </div>

        <p className="font-dm text-sm text-soft mb-4">
          聆音是一款简洁优雅的音乐播放器，让你轻松发现和享受好音乐。以下是核心功能：
        </p>

        <div className="space-y-3 mb-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <p className="font-outfit font-semibold text-sm text-primary">{f.title}</p>
                  <p className="font-dm text-xs text-soft mt-0.5">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleClose}
          className="w-full py-2.5 rounded-full text-sm font-dm font-semibold text-white transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "0 2px 12px -2px color-mix(in srgb, var(--accent) 40%, transparent)",
          }}
        >
          开始探索
        </button>
      </div>
    </div>
  );
}
