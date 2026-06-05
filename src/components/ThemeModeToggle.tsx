import { useEffect } from "react";
import usePlayerStore from "../store/playerStore";
import type { DayThemeName } from "../types";

const DAY_THEMES: { name: DayThemeName; label: string; primary: string; secondary: string }[] = [
  { name: "mint", label: "薄荷", primary: "#0D9488", secondary: "#F59E0B" },
  { name: "peach", label: "蜜桃", primary: "#F97316", secondary: "#F43F5E" },
  { name: "sky", label: "晴空", primary: "#0EA5E9", secondary: "#06B6D4" },
  { name: "lavender", label: "薰衣", primary: "#8B5CF6", secondary: "#EC4899" },
  { name: "sand", label: "沙金", primary: "#D97706", secondary: "#92400E" },
  { name: "rose", label: "玫红", primary: "#E11D48", secondary: "#F472B6" },
];

const NIGHT_THEMES = [
  { name: "purple", label: "星紫", primary: "#A855F7", secondary: "#F97316" },
  { name: "black", label: "极夜", primary: "#A855F7", secondary: "#F97316" },
] as const;

export default function ThemeModeToggle() {
  const themeMode = usePlayerStore((s) => s.themeMode);
  const dayTheme = usePlayerStore((s) => s.dayTheme);
  const theme = usePlayerStore((s) => s.theme);
  const setThemeMode = usePlayerStore((s) => s.setThemeMode);
  const setDayTheme = usePlayerStore((s) => s.setDayTheme);
  const setTheme = usePlayerStore((s) => s.setTheme);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("day", "night", "black", "mint", "peach", "sky", "lavender", "sand", "rose");
    html.classList.add(themeMode);
    if (themeMode === "day") {
      html.classList.add(dayTheme);
    } else {
      html.classList.add(theme);
    }
  }, [themeMode, dayTheme, theme]);

  const isDay = themeMode === "day";
  const currentList = isDay ? DAY_THEMES : NIGHT_THEMES;

  return (
    <div className="flex items-center gap-2">
      <div
        className="inline-flex rounded-full p-1 border border-default"
        style={{ background: "var(--card-soft)" }}
      >
        <button
          onClick={() => setThemeMode("day")}
          className="px-3 py-1.5 rounded-full text-xs font-dm transition-all duration-200 clickable-pill"
          style={{
            background: isDay ? "var(--accent)" : "transparent",
            color: isDay ? "white" : "var(--text-soft)",
          }}
        >
          ☀ 日间
        </button>
        <button
          onClick={() => setThemeMode("night")}
          className="px-3 py-1.5 rounded-full text-xs font-dm transition-all duration-200 clickable-pill"
          style={{
            background: !isDay ? "var(--accent)" : "transparent",
            color: !isDay ? "white" : "var(--text-soft)",
          }}
        >
          ☾ 夜间
        </button>
      </div>

      <div className="hidden md:flex items-center gap-1.5 pl-2 ml-1 border-l border-default">
        {currentList.map((t) => {
          const isActive = isDay ? dayTheme === t.name : theme === t.name;
          return (
            <button
              key={t.name}
              onClick={() => {
                if (isDay) {
                  setDayTheme(t.name as DayThemeName);
                } else {
                  setTheme(t.name as typeof theme);
                }
              }}
              className="w-6 h-6 rounded-full clickable-pill transition-transform hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
                opacity: isActive ? 1 : 0.45,
                boxShadow: isActive ? `0 0 10px ${t.primary}80` : undefined,
              }}
              title={t.label}
              aria-label={t.label}
            />
          );
        })}
      </div>
    </div>
  );
}
