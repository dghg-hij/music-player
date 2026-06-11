import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Home, User, Music2, ListMusic, Disc3, LogOut, ChevronDown, Settings as SettingsIcon, Sparkles } from "lucide-react";
import ThemeModeToggle from "./ThemeModeToggle";
import AuthModal from "./AuthModal";
import ProfileEditModal from "./ProfileEditModal";
import useAuthStore from "../store/authStore";

const NAV_ITEMS = [
  { to: "/", label: "首页", icon: Home, end: true },
  { to: "/recommend", label: "推荐", icon: Sparkles },
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
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
  };

  return (
    <>
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

          <div className="ml-auto flex items-center gap-2">
            <ThemeModeToggle />
            <NavLink
              to="/settings"
              aria-label="设置中心"
              title="设置中心"
              className={({ isActive }) =>
                `clickable-pill w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  isActive ? "" : "text-soft"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background:
                        "color-mix(in srgb, var(--accent) 18%, transparent)",
                      color: "var(--accent)",
                    }
                  : undefined
              }
            >
              <SettingsIcon size={16} />
            </NavLink>

            {isLoggedIn && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full transition-all duration-200"
                  style={{
                    background: showDropdown ? "var(--card-soft)" : "transparent",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-dm font-bold text-white"
                    style={{
                      background: user.avatar
                        ? undefined
                        : "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    }}
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      user.nickname.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <span className="font-dm text-sm text-primary max-w-[80px] truncate hidden sm:inline">
                    {user.nickname}
                  </span>
                  <ChevronDown size={14} className="text-soft" />
                </button>

                {showDropdown && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
                      <p className="font-outfit font-semibold text-sm text-primary truncate">
                        {user.nickname}
                      </p>
                      {user.phone && (
                        <p className="font-dm text-xs text-soft mt-0.5">
                          {user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}
                        </p>
                      )}
                    </div>
                    <div className="p-1.5">
                      <NavLink
                        to="/my"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-dm text-primary hover:bg-card-soft transition-colors w-full"
                        style={{ background: "transparent" }}
                      >
                        <User size={14} className="text-soft" />
                        个人中心
                      </NavLink>
                      <NavLink
                        to="/settings"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-dm text-primary hover:bg-card-soft transition-colors w-full"
                        style={{ background: "transparent" }}
                      >
                        <SettingsIcon size={14} className="text-soft" />
                        设置中心
                      </NavLink>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-dm w-full transition-colors"
                        style={{ color: "var(--error)", background: "transparent" }}
                      >
                        <LogOut size={14} />
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal("login")}
                className="px-4 py-1.5 rounded-full text-sm font-dm font-semibold text-white transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  boxShadow: "0 2px 10px -2px var(--accent)",
                }}
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>
      <AuthModal />
      <ProfileEditModal />
    </>
  );
}
