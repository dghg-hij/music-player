import { useEffect } from "react";
import usePlayerStore from "../store/playerStore";
import type { DayThemeName } from "../types";

const DAY_THEMES: { name: DayThemeName; label: string; primary: string; secondary: string }[] = [
  { name: "mint", label: "竹青", primary: "#7A9079", secondary: "#B8946A" },
  { name: "peach", label: "缃色", primary: "#B8946A", secondary: "#A87A5A" },
  { name: "sky", label: "天青", primary: "#7A8C9A", secondary: "#A3B5C0" },
  { name: "lavender", label: "紫", primary: "#8A7A9B", secondary: "#A89BB5" },
  { name: "sand", label: "秋香", primary: "#A87A5A", secondary: "#C4A572" },
  { name: "rose", label: "胭脂", primary: "#A85A4A", secondary: "#C47868" },
];

const NIGHT_THEMES = [
  { name: "purple", label: "玄紫", primary: "#8A7A9B", secondary: "#A87A5A" },
  { name: "black", label: "夜雨", primary: "#8A7A9B", secondary: "#A87A5A" },
] as const;

/** 无 UI 副作用：监听 store 中 themeMode/dayTheme/theme 变化，
 *  同步切换 <html> 上的 day/night + 色系 class。
 *  必须挂一份在 App 顶层（任意位置），否则 CSS 主题不会生效。 */
export function ThemeSync() {
  const themeMode = usePlayerStore((s) => s.themeMode);
  const dayTheme = usePlayerStore((s) => s.dayTheme);
  const theme = usePlayerStore((s) => s.theme);

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

  return null;
}

/** 仅日/夜切换的胶囊按钮（不放色系圆点，给 TopNav 用，节省横向空间） */
export function DayNightToggle() {
  const themeMode = usePlayerStore((s) => s.themeMode);
  const setThemeMode = usePlayerStore((s) => s.setThemeMode);
  const isDay = themeMode === "day";

  return (
    <div
      className="inline-flex rounded-btn-pill p-1 border border-default"
      style={{ background: "var(--card-soft)" }}
      role="group"
      aria-label="日间/夜间模式"
    >
      <button
        onClick={() => setThemeMode("day")}
        className="px-3 py-1 rounded-btn-pill text-caption font-dm transition-all duration-200"
        style={{
          background: isDay ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "transparent",
          color: isDay ? "white" : "var(--text-soft)",
        }}
        aria-pressed={isDay}
      >
        ☀ 日间
      </button>
      <button
        onClick={() => setThemeMode("night")}
        className="px-3 py-1 rounded-btn-pill text-caption font-dm transition-all duration-200"
        style={{
          background: !isDay ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "transparent",
          color: !isDay ? "white" : "var(--text-soft)",
        }}
        aria-pressed={!isDay}
      >
        ☾ 夜间
      </button>
    </div>
  );
}

/** 完整版：日/夜 pill + 色系圆点，给设置页用 */
export default function ThemeModeToggle() {
  const themeMode = usePlayerStore((s) => s.themeMode);
  const dayTheme = usePlayerStore((s) => s.dayTheme);
  const theme = usePlayerStore((s) => s.theme);
  const setThemeMode = usePlayerStore((s) => s.setThemeMode);
  const setDayTheme = usePlayerStore((s) => s.setDayTheme);
  const setTheme = usePlayerStore((s) => s.setTheme);

  const isDay = themeMode === "day";
  const currentList = isDay ? DAY_THEMES : NIGHT_THEMES;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex rounded-btn-pill p-1 border border-default"
        style={{ background: "var(--card-soft)" }}
      >
        <button
          onClick={() => setThemeMode("day")}
          className="px-3 py-1 rounded-btn-pill text-caption font-dm transition-all duration-200"
          style={{
            background: isDay ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "transparent",
            color: isDay ? "white" : "var(--text-soft)",
          }}
        >
          ☀ 日间
        </button>
        <button
          onClick={() => setThemeMode("night")}
          className="px-3 py-1 rounded-btn-pill text-caption font-dm transition-all duration-200"
          style={{
            background: !isDay ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "transparent",
            color: !isDay ? "white" : "var(--text-soft)",
          }}
        >
          ☾ 夜间
        </button>
      </div>

      <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-default">
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
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
                opacity: isActive ? 1 : 0.45,
                boxShadow: isActive ? `0 0 10px ${t.primary}80` : undefined,
                border: isActive ? `2px solid var(--text)` : "2px solid transparent",
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
