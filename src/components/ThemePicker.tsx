import { Palette, Check } from "lucide-react";
import usePlayerStore from "../store/playerStore";
import type { ThemeName } from "../types";

const THEMES: { name: ThemeName; label: string; colors: string[] }[] = [
  { name: "purple", label: "星紫", colors: ["#A855F7", "#F97316"] },
  { name: "ocean", label: "深海", colors: ["#0EA5E9", "#06B6D4"] },
  { name: "sunset", label: "落日", colors: ["#F43F5E", "#FB923C"] },
  { name: "forest", label: "森林", colors: ["#22C55E", "#14B8A6"] },
  { name: "rose", label: "玫瑰", colors: ["#EC4899", "#F472B6"] },
  { name: "midnight", label: "午夜", colors: ["#6366F1", "#818CF8"] },
];

export function getThemeColors(theme: ThemeName) {
  const t = THEMES.find((t) => t.name === theme) || THEMES[0];
  return { primary: t.colors[0], secondary: t.colors[1] };
}

export default function ThemePicker() {
  const theme = usePlayerStore((s) => s.theme);
  const setTheme = usePlayerStore((s) => s.setTheme);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Palette size={16} className="text-white/40" />
        <h3 className="font-outfit font-semibold text-sm text-white/70">
          主题
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((t) => {
          const isActive = theme === t.name;
          return (
            <button
              key={t.name}
              onClick={() => setTheme(t.name)}
              className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-white/10 ring-1 ring-white/20"
                  : "hover:bg-white/5"
              }`}
            >
              <div
                className="w-8 h-8 rounded-full relative"
                style={{
                  background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`,
                  boxShadow: isActive
                    ? `0 0 12px ${t.colors[0]}60`
                    : "none",
                }}
              >
                {isActive && (
                  <Check
                    size={14}
                    className="absolute inset-0 m-auto text-white"
                    strokeWidth={3}
                  />
                )}
              </div>
              <span className="font-dm text-[10px] text-white/50">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
