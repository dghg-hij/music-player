import { NavLink, useLocation } from "react-router-dom";
import { Home, Sparkles, Disc3, User } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "首页", icon: Home, end: true },
  { to: "/recommend", label: "个性化推荐", icon: Sparkles },
  { to: "/library", label: "乐库", icon: Disc3 },
  { to: "/my", label: "个人中心", icon: User },
];

function navItemStyle(isActive: boolean): React.CSSProperties {
  if (isActive) {
    return {
      color: "var(--accent)",
    };
  }
  return {};
}

export default function BottomNav() {
  const location = useLocation();

  // 播放页不显示底部导航（因为是沉浸式全屏）
  if (location.pathname === "/play") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-default md:hidden"
      style={{
        background: "color-mix(in srgb, var(--bg) 92%, transparent)",
        backdropFilter: "blur(18px) saturate(1.3)",
        WebkitBackdropFilter: "blur(18px) saturate(1.3)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="底部导航"
    >
      <div className="grid grid-cols-4 h-16 max-w-7xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => navItemStyle(isActive)}
              className={({ isActive }) =>
                `group flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${
                  isActive ? "" : "text-soft"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200 ${
                      isActive ? "scale-110" : ""
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              "color-mix(in srgb, var(--accent) 18%, transparent)",
                          }
                        : undefined
                    }
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.4 : 1.8}
                    />
                  </span>
                  <span
                    className={`text-[10px] font-dm leading-none whitespace-nowrap ${
                      isActive ? "font-semibold" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
