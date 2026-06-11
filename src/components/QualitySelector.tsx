import { useState } from "react";
import { Volume2, Check, X } from "lucide-react";
import { QUALITY_META, type AudioQuality } from "../types";

interface QualitySelectorProps {
  current: AudioQuality;
  onSelect: (q: AudioQuality) => void;
  onClose: () => void;
}

export default function QualitySelector({
  current,
  onSelect,
  onClose,
}: QualitySelectorProps) {
  const [hovered, setHovered] = useState<AudioQuality | null>(null);

  const handleClick = (q: AudioQuality) => {
    if (q === current) return;
    onSelect(q);
  };

  const levels: AudioQuality[] = ["standard", "high", "lossless"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="card-surface w-full max-w-sm p-5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Volume2 size={18} style={{ color: "var(--accent)" }} />
            <h3 className="font-outfit text-lg font-semibold text-primary">音质选择</h3>
          </div>
          <button
            onClick={onClose}
            className="song-row-action"
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-2">
          {levels.map((q) => {
            const meta = QUALITY_META[q];
            const isCurrent = q === current;
            const isHovered = hovered === q;

            return (
              <button
                key={q}
                onClick={() => handleClick(q)}
                onMouseEnter={() => setHovered(q)}
                onMouseLeave={() => setHovered(null)}
                disabled={isCurrent}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                style={{
                  background: isCurrent
                    ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                    : isHovered
                      ? "var(--card-soft)"
                      : "transparent",
                  border: isCurrent
                    ? "1px solid color-mix(in srgb, var(--accent) 30%, transparent)"
                    : "1px solid transparent",
                  cursor: isCurrent ? "default" : "pointer",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-outfit text-sm font-semibold text-primary"
                    >
                      {meta.label}
                    </span>
                    {isCurrent && (
                      <Check size={12} style={{ color: "var(--accent)" }} />
                    )}
                  </div>
                  <p className="font-dm text-xs text-soft mt-0.5">
                    {meta.bitrate}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <p
          className="mt-4 pt-3 font-dm text-xs text-soft"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          默认采用无损音质，可按需切换。流量敏感场景建议选择"标准"或"高清"。
        </p>
      </div>
    </div>
  );
}
