import { NavLink } from "react-router-dom";
import { Home, User, Music2, ListMusic, Disc3 } from "lucide-react";
import ThemeModeToggle from "./ThemeModeToggle";

const NAV_ITEMS = [
  { to: "/", label: "首页", icon: Home, end: true },
  { to: "/ranking", label: "排行榜", icon: ListMusic },
  { to: "/library", label: "曲库", icon: Disc3 },
  { to: "/my", label: "我的", icon: User },
];

function navItemStyle(isActive: boolean) {
  return isActive
    ? {
        background: "color-mix(in srgb, var(--accent) 18%, transparent)",
        color: "var(--accent)",
      }
    : undefined;
}

export default function TopNav() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-default"
      style={{
        background: "color-mix(in srgb, var(--bg) 85%, transparent)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-4">
        <NavLink
          to="/"
          className="flex items-center gap-2 clickable-ring px-3 py-1.5"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 0 12px -2px var(--accent)",
            }}
          >
            <Music2 size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-outfit font-bold text-lg text-primary">聆音</span>
        </NavLink>

        <nav className="flex items-center gap-1 ml-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => navItemStyle(isActive)}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-dm transition-all duration-200 ${
                    isActive
                      ? "clickable-pill"
                      : "text-soft hover:text-primary clickable-pill"
                  }`
                }
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto">
          <ThemeModeToggle />
        </div>
      </div>
    </header>
  );
}
