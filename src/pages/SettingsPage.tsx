/**
 * 模块 8 设置中心 - PRD 3.8
 * 分区：播放设置 / 界面设置 / 账号设置 / 关于与反馈
 */
import { useEffect, useMemo, useState } from "react";
import {
  Settings as SettingsIcon,
  Play,
  Palette,
  Shield,
  Info,
  ChevronRight,
  RefreshCw,
  Trash2,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  RotateCcw,
  Check,
  Sparkles,
  Download,
  Database,
  Languages,
  Type as TypeIcon,
  MonitorSmartphone,
  Sun,
  Moon,
  ArrowLeft,
  Music2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import usePlayerStore from "../store/playerStore";
import useAuthStore from "../store/authStore";
import {
  CACHE_SIZE_MAX_MB,
  CACHE_SIZE_MIN_MB,
  LYRIC_FONT_MAX,
  LYRIC_FONT_MIN,
  PLAYBACK_RATE_OPTIONS,
  QUALITY_META,
} from "../types";
import type { ThemePreference } from "../types";
import { submitFeedback, checkForUpdate } from "../services/settingsApi";

type SectionId = "playback" | "ui" | "account" | "about";

const SECTIONS: { id: SectionId; label: string; icon: typeof Play }[] = [
  { id: "playback", label: "播放设置", icon: Play },
  { id: "ui", label: "界面设置", icon: Palette },
  { id: "account", label: "账号设置", icon: Shield },
  { id: "about", label: "关于与反馈", icon: Info },
];

const APP_VERSION = "V1.0-Final";

function formatCacheSize(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}

/* ---------- 通用 UI 组件 ---------- */

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 p-4 rounded-2xl"
      style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-outfit font-semibold text-sm text-primary">{title}</p>
        {description && (
          <p className="font-dm text-xs text-soft mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors duration-200"
      style={{
        background: checked
          ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
          : "var(--border-strong)",
        boxShadow: checked ? `0 0 10px -2px var(--accent)` : undefined,
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200"
        style={{ transform: `translateX(${checked ? 22 : 2}px)` }}
      />
    </button>
  );
}

function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex p-1 rounded-full"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-full text-xs font-dm font-medium transition-all"
            style={{
              background: active
                ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                : "transparent",
              color: active ? "white" : "var(--text-soft)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <input
        type="range"
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <span className="font-dm text-xs text-primary min-w-[56px] text-right tabular-nums">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

/* ---------- 主组件 ---------- */

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("playback");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const navigate = useNavigate();

  // 初始化时刷新一次缓存占用
  useEffect(() => {
    usePlayerStore.getState().refreshCacheUsage();
  }, []);

  return (
    <div className="space-y-6">
      {/* 顶部 Hero */}
      <div
        className="relative overflow-hidden rounded-card p-6 md:p-8 glass"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--card)) 0%, color-mix(in srgb, var(--accent-2) 6%, var(--card)) 100%)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "var(--accent)" }}
        />
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            <SettingsIcon size={20} className="text-white" />
          </div>
          <h1 className="font-outfit font-bold text-3xl md:text-4xl text-primary">设置中心</h1>
        </div>
        <p className="font-dm text-sm text-soft max-w-2xl">
          个性化你的播放体验。设置会自动保存，刷新或重新打开后依旧生效。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/"
            className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary inline-flex items-center gap-1.5"
            style={{ background: "var(--card-soft)", border: "1px solid var(--border-strong)" }}
          >
            <ArrowLeft size={12} /> 返回首页
          </Link>
          <span
            className="px-3 py-1.5 rounded-full text-xs font-dm text-primary inline-flex items-center gap-1.5"
            style={{ background: "var(--card-soft)", border: "1px solid var(--border-strong)" }}
          >
            <Sparkles size={12} /> 聆音 {APP_VERSION}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-6">
        {/* 侧边导航 */}
        <aside className="card-surface p-2 h-fit lg:sticky lg:top-20">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="clickable-pill flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-dm whitespace-nowrap transition-all w-full text-left"
                  style={
                    active
                      ? {
                          background:
                            "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent-2) 14%, transparent))",
                          color: "var(--accent)",
                        }
                      : { color: "var(--text-soft)" }
                  }
                >
                  <Icon size={16} />
                  <span className="flex-1">{s.label}</span>
                  {active && <ChevronRight size={14} />}
                </button>
              );
            })}
          </nav>
          <div className="hidden lg:block mt-3 p-3 rounded-xl" style={{ background: "var(--card-soft)" }}>
            <p className="font-dm text-[11px] text-soft leading-relaxed">
              所有设置均存储于本地并按 PRD 7.1 要求持久化。如登录后，服务器会同步偏好（占位接口 PUT
              /api/user/settings）。
            </p>
          </div>
        </aside>

        {/* 内容区 */}
        <section className="space-y-6 min-w-0">
          {activeSection === "playback" && <PlaybackSection />}
          {activeSection === "ui" && <UISection />}
          {activeSection === "account" && <AccountSection onLogoutDone={() => navigate("/")} />}
          {activeSection === "about" && <AboutSection />}

          {/* 全局操作：重置 / 返回 */}
          <div className="card-surface p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-dm text-xs text-soft">
              误改了设置？一键恢复为推荐默认值。
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="clickable-pill px-4 py-2 rounded-full text-sm font-dm text-primary inline-flex items-center gap-1.5"
                style={{ background: "var(--card-soft)", border: "1px solid var(--border-strong)" }}
              >
                <RotateCcw size={14} /> 恢复默认
              </button>
            </div>
          </div>
        </section>
      </div>

      {showResetConfirm && (
        <ConfirmDialog
          title="恢复默认设置？"
          message="将清空播放速度、音质、字号、主题偏好、隐私等所有个性化设置，但不会影响账号、收藏和歌单。"
          confirmText="恢复默认"
          onCancel={() => setShowResetConfirm(false)}
          onConfirm={() => {
            usePlayerStore.getState().resetSettings();
            usePlayerStore.getState().showToast("已恢复默认设置", "success");
            setShowResetConfirm(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- 分区：播放设置 ---------- */

function PlaybackSection() {
  const cacheSize = usePlayerStore((s) => s.cacheSize);
  const setCacheSize = usePlayerStore((s) => s.setCacheSize);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const quality = usePlayerStore((s) => s.quality);
  const setQuality = usePlayerStore((s) => s.setQuality);
  const autoPlay = usePlayerStore((s) => s.autoPlay);
  const setAutoPlay = usePlayerStore((s) => s.setAutoPlay);
  const cacheUsed = usePlayerStore((s) => s.cacheUsed);
  const refreshCacheUsage = usePlayerStore((s) => s.refreshCacheUsage);
  const clearLocalCache = usePlayerStore((s) => s.clearLocalCache);

  return (
    <div className="space-y-4">
      <SectionHeader icon={Play} title="播放设置" description="调整缓存、速度、音质与启动行为" />

      {/* 缓存大小 */}
      <SettingRow
        title="缓存大小"
        description={`已用约 ${formatCacheSize(Math.round(cacheUsed * 1024))} / 上限 ${formatCacheSize(cacheSize)}。超出后自动清理最早的非收藏歌曲。`}
      >
        <div className="flex flex-col items-end gap-2 w-full md:w-[280px]">
          <Slider
            value={cacheSize}
            min={CACHE_SIZE_MIN_MB}
            max={CACHE_SIZE_MAX_MB}
            step={512}
            onChange={setCacheSize}
            format={formatCacheSize}
            ariaLabel="缓存大小"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refreshCacheUsage();
                usePlayerStore.getState().showToast("已刷新缓存占用", "info");
              }}
              className="clickable-pill px-2.5 py-1 rounded-full text-[11px] font-dm text-soft inline-flex items-center gap-1"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <RefreshCw size={10} /> 刷新
            </button>
            <button
              onClick={() => {
                clearLocalCache();
                usePlayerStore.getState().showToast("已清空本地缓存", "success");
              }}
              className="clickable-pill px-2.5 py-1 rounded-full text-[11px] font-dm inline-flex items-center gap-1"
              style={{
                background: "color-mix(in srgb, var(--error) 8%, transparent)",
                color: "var(--error)",
                border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
              }}
            >
              <Trash2 size={10} /> 清空
            </button>
          </div>
        </div>
      </SettingRow>

      {/* 播放速度 */}
      <SettingRow
        title="播放速度"
        description="调整音频播放倍速。变化立即生效，不影响歌曲时长统计。"
      >
        <SegmentedControl
          value={playbackRate}
          options={PLAYBACK_RATE_OPTIONS.map((r) => ({ value: r, label: `${r}x` }))}
          onChange={setPlaybackRate}
          ariaLabel="播放速度"
        />
      </SettingRow>

      {/* 音质优先 */}
      <SettingRow
        title="音质优先"
        description={`当前音质：${QUALITY_META[quality].label}（${QUALITY_META[quality].bitrate}）。默认采用无损，体验最佳。`}
      >
        <SegmentedControl
          value={quality}
          options={(["standard", "high", "lossless"] as const).map((q) => ({
            value: q,
            label: QUALITY_META[q].label,
          }))}
          onChange={setQuality}
          ariaLabel="音质优先"
        />
      </SettingRow>

      {/* 启动自动播放 */}
      <SettingRow
        title="启动自动播放"
        description="打开应用时，自动恢复上次播放的歌曲并继续播放。需用户首次点击授权。"
      >
        <Toggle checked={autoPlay} onChange={setAutoPlay} label="启动自动播放" />
      </SettingRow>
    </div>
  );
}

/* ---------- 分区：界面设置 ---------- */

function UISection() {
  const themePreference = usePlayerStore((s) => s.themePreference);
  const setThemePreference = usePlayerStore((s) => s.setThemePreference);
  const lyricFontSize = usePlayerStore((s) => s.lyricFontSize);
  const setLyricFontSize = usePlayerStore((s) => s.setLyricFontSize);
  const lyricTranslation = usePlayerStore((s) => s.lyricTranslation);
  const setLyricTranslation = usePlayerStore((s) => s.setLyricTranslation);

  const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = useMemo(
    () => [
      { value: "light", label: "浅色", icon: Sun },
      { value: "dark", label: "深色", icon: Moon },
      { value: "system", label: "跟随系统", icon: MonitorSmartphone },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <SectionHeader icon={Palette} title="界面设置" description="主题、歌词外观" />

      <SettingRow
        title="主题"
        description="跟随系统会监听操作系统的深色/浅色设置自动切换。"
      >
        <div className="inline-flex p-1 rounded-full" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = themePreference === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setThemePreference(opt.value)}
                className="px-3 py-1.5 rounded-full text-xs font-dm font-medium transition-all inline-flex items-center gap-1.5"
                style={{
                  background: active
                    ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                    : "transparent",
                  color: active ? "white" : "var(--text-soft)",
                }}
                aria-pressed={active}
              >
                <Icon size={12} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </SettingRow>

      <SettingRow
        title="歌词字体大小"
        description="调整全屏歌词视图的字号，实时预览。"
      >
        <div className="flex items-center gap-3">
          <TypeIcon size={12} className="text-faint" />
          <Slider
            value={lyricFontSize}
            min={LYRIC_FONT_MIN}
            max={LYRIC_FONT_MAX}
            onChange={setLyricFontSize}
            format={(v) => `${v}px`}
            ariaLabel="歌词字体大小"
          />
        </div>
      </SettingRow>

      {/* 字号预览 */}
      <div
        className="rounded-2xl px-4 py-6 text-center"
        style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
      >
        <p className="font-dm text-[11px] text-faint mb-2">字号预览</p>
        <p
          className="font-outfit font-semibold text-primary"
          style={{ fontSize: `${lyricFontSize}px` }}
        >
          这是当前歌词的预览
        </p>
        <p className="font-dm text-soft mt-1" style={{ fontSize: `${Math.max(12, lyricFontSize - 4)}px` }}>
          The quick brown fox jumps over the lazy dog
        </p>
      </div>

      <SettingRow
        title="歌词翻译"
        description="有翻译时同时显示译文行。"
      >
        <Toggle
          checked={lyricTranslation}
          onChange={setLyricTranslation}
          label="歌词翻译"
        />
      </SettingRow>
    </div>
  );
}

/* ---------- 分区：账号设置 ---------- */

function AccountSection({ onLogoutDone }: { onLogoutDone: () => void }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const changePassword = useAuthStore((s) => s.changePassword);
  const showToast = usePlayerStore((s) => s.showToast);

  const privacy = usePlayerStore((s) => s.privacy);
  const setPrivacy = usePlayerStore((s) => s.setPrivacy);

  const [showChangePwd, setShowChangePwd] = useState(false);

  return (
    <div className="space-y-4">
      <SectionHeader icon={Shield} title="账号设置" description="登录状态、密码与隐私" />

      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-dm font-bold text-white"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          }}
        >
          {(user?.nickname || "游").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-outfit font-semibold text-sm text-primary truncate">
            {isLoggedIn && user ? user.nickname : "未登录"}
          </p>
          <p className="font-dm text-xs text-soft mt-0.5 truncate">
            {isLoggedIn && user
              ? user.phone
                ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
                : `UID: ${user.uid}`
              : "登录后即可同步偏好、收藏与播放历史"}
          </p>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-dm"
          style={{
            background: isLoggedIn
              ? "color-mix(in srgb, var(--success) 12%, transparent)"
              : "var(--bg)",
            color: isLoggedIn ? "var(--success)" : "var(--text-soft)",
            border: `1px solid ${isLoggedIn ? "color-mix(in srgb, var(--success) 35%, transparent)" : "var(--border)"}`,
          }}
        >
          {isLoggedIn ? "已登录" : "未登录"}
        </span>
      </div>

      <SettingRow
        title="修改密码"
        description="需要先登录账号。修改成功后需要重新登录。"
      >
        <button
          onClick={() => setShowChangePwd(true)}
          disabled={!isLoggedIn}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <KeyRound size={12} /> 修改
        </button>
      </SettingRow>

      <SettingRow
        title="播放记录公开"
        description="开启后，其他用户可在你的主页查看最近播放。"
      >
        <Toggle
          checked={privacy.publicHistory}
          onChange={(v) => setPrivacy({ publicHistory: v })}
          label="播放记录公开"
        />
      </SettingRow>

      <SettingRow
        title="个性化推荐"
        description="允许根据你的播放、收藏、搜索历史进行个性化推荐。关闭后仍可使用，但不展示推荐内容。"
      >
        <Toggle
          checked={privacy.allowRecommend}
          onChange={(v) => setPrivacy({ allowRecommend: v })}
          label="个性化推荐"
        />
      </SettingRow>

      <SettingRow
        title="退出登录"
        description="清除本地登录状态，下次进入需重新登录。不会删除本地数据。"
      >
        <button
          onClick={() => {
            if (!isLoggedIn) {
              showToast("当前未登录", "info");
              return;
            }
            logout();
            showToast("已退出登录", "success");
            onLogoutDone();
          }}
          disabled={!isLoggedIn}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "color-mix(in srgb, var(--error) 8%, transparent)",
            color: "var(--error)",
            border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
          }}
        >
          <LogOut size={12} /> 退出登录
        </button>
      </SettingRow>

      {showChangePwd && (
        <ChangePasswordDialog
          onCancel={() => setShowChangePwd(false)}
          onSubmit={(oldPwd, newPwd) => {
            const err = changePassword(oldPwd, newPwd);
            if (err) {
              showToast(err, "warning");
              return false;
            }
            showToast("密码已更新，请重新登录", "success");
            logout();
            setShowChangePwd(false);
            onLogoutDone();
            return true;
          }}
        />
      )}
    </div>
  );
}

function ChangePasswordDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (oldPwd: string, newPwd: string) => boolean;
}) {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const valid = /^[a-zA-Z0-9]{8,16}$/.test(newPwd) && newPwd === confirmPwd && oldPwd.length > 0;

  return (
    <Modal onClose={onCancel} title="修改密码">
      <div className="space-y-3">
        <PasswordInput
          label="原密码"
          value={oldPwd}
          onChange={setOldPwd}
          visible={showOld}
          onToggleVisible={() => setShowOld((v) => !v)}
        />
        <PasswordInput
          label="新密码（8-16 位字母数字）"
          value={newPwd}
          onChange={setNewPwd}
          visible={showNew}
          onToggleVisible={() => setShowNew((v) => !v)}
        />
        <PasswordInput
          label="确认新密码"
          value={confirmPwd}
          onChange={setConfirmPwd}
          visible={showNew}
          onToggleVisible={() => setShowNew((v) => !v)}
        />
        {newPwd && !/^[a-zA-Z0-9]{8,16}$/.test(newPwd) && (
          <p className="font-dm text-xs" style={{ color: "var(--error)" }}>
            新密码需 8-16 位字母数字组合
          </p>
        )}
        {confirmPwd && newPwd !== confirmPwd && (
          <p className="font-dm text-xs" style={{ color: "var(--error)" }}>
            两次输入的密码不一致
          </p>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="clickable-pill px-3 py-1.5 rounded-full text-sm font-dm text-soft"
          >
            取消
          </button>
          <button
            disabled={!valid}
            onClick={() => onSubmit(oldPwd, newPwd)}
            className="clickable-pill px-4 py-1.5 rounded-full text-sm font-dm text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            确认修改
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <label className="block">
      <span className="font-dm text-xs text-soft">{label}</span>
      <div
        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-primary"
        />
        <button
          onClick={onToggleVisible}
          className="text-soft clickable-pill p-1 rounded-full"
          aria-label="切换密码可见性"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </label>
  );
}

/* ---------- 分区：关于与反馈 ---------- */

function AboutSection() {
  const showToast = usePlayerStore((s) => s.showToast);
  const [showFeedback, setShowFeedback] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    latestVersion: string;
    releaseNotes?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await checkForUpdate(APP_VERSION);
      setUpdateInfo(res);
      if (res.hasUpdate) {
        showToast(`发现新版本 ${res.latestVersion}`, "info");
      } else {
        showToast("当前已是最新版本", "success");
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader icon={Info} title="关于与反馈" description="版本信息与意见反馈" />

      <SettingRow title="版本信息" description={`聆音 ${APP_VERSION} · Web/PC 客户端`}>
        <button
          onClick={handleCheck}
          disabled={checking}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-primary inline-flex items-center gap-1.5 disabled:opacity-50"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <RefreshCw size={12} className={checking ? "animate-spin" : ""} />{" "}
          {checking ? "检查中" : "检查更新"}
        </button>
      </SettingRow>

      {updateInfo && (
        <div
          className="rounded-2xl p-3 flex items-start gap-2"
          style={{
            background: "color-mix(in srgb, var(--success) 8%, var(--card-soft))",
            border: "1px solid color-mix(in srgb, var(--success) 25%, var(--border))",
          }}
        >
          <Check size={14} className="mt-0.5" style={{ color: "var(--success)" }} />
          <div>
            <p className="font-dm text-xs text-primary">
              {updateInfo.hasUpdate
                ? `最新版本：${updateInfo.latestVersion}`
                : `已是最新版本：${updateInfo.latestVersion}`}
            </p>
            {updateInfo.releaseNotes && (
              <p className="font-dm text-[11px] text-soft mt-0.5">{updateInfo.releaseNotes}</p>
            )}
          </div>
        </div>
      )}

      <SettingRow
        title="问题反馈"
        description="使用中遇到问题或有建议？提交反馈我们会尽快处理。"
      >
        <button
          onClick={() => setShowFeedback(true)}
          className="clickable-pill px-3 py-1.5 rounded-full text-xs font-dm text-white inline-flex items-center gap-1.5"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <Send size={12} /> 提反馈
        </button>
      </SettingRow>

      <div
        className="rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3"
        style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
      >
        <Stat icon={Music2} label="歌曲库" value="1000+" />
        <Stat icon={Download} label="下载管理" value="本地优先" />
        <Stat icon={Database} label="设置同步" value="已就绪" />
        <Stat icon={Languages} label="语言" value="简体中文" />
      </div>

      {showFeedback && (
        <FeedbackDialog
          onCancel={() => setShowFeedback(false)}
          onSubmit={async (content, contact) => {
            const res = await submitFeedback({ content, contact });
            showToast(`反馈已提交（#${res.id.slice(-4)}）`, "success");
            setShowFeedback(false);
          }}
        />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Music2; label: string; value: string }) {
  return (
    <div className="text-center">
      <Icon size={16} className="mx-auto text-faint" />
      <p className="font-outfit font-semibold text-sm text-primary mt-1">{value}</p>
      <p className="font-dm text-[11px] text-soft">{label}</p>
    </div>
  );
}

/* ---------- 反馈弹窗 ---------- */

function FeedbackDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (content: string, contact?: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = content.trim().length >= 5 && content.length <= 500;

  return (
    <Modal onClose={onCancel} title="问题反馈">
      <div className="space-y-3">
        <label className="block">
          <span className="font-dm text-xs text-soft">问题描述（5-500 字）</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="详细描述你遇到的问题或建议..."
            className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-primary outline-none resize-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          />
          <span className="font-dm text-[11px] text-faint mt-1 inline-block">
            {content.length} / 500
          </span>
        </label>
        <label className="block">
          <span className="font-dm text-xs text-soft">联系方式（可选，手机号/邮箱）</span>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="便于我们回复你"
            className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-primary outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          />
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="clickable-pill px-3 py-1.5 rounded-full text-sm font-dm text-soft"
          >
            取消
          </button>
          <button
            disabled={!valid || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit(content.trim(), contact.trim() || undefined);
              } finally {
                setSubmitting(false);
              }
            }}
            className="clickable-pill px-4 py-1.5 rounded-full text-sm font-dm text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            {submitting ? "提交中..." : "提交"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- 通用弹窗 ---------- */

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, black 60%, transparent)" }}
      onClick={onClose}
    >
      <div
        className="card-surface w-full max-w-md p-5 glass-strong"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-outfit font-semibold text-base text-primary mb-3">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText = "取消",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="font-dm text-sm text-soft leading-relaxed mb-4">{message}</p>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="clickable-pill px-3 py-1.5 rounded-full text-sm font-dm text-soft"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className="clickable-pill px-4 py-1.5 rounded-full text-sm font-dm text-white"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Play;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
          color: "var(--accent)",
        }}
      >
        <Icon size={16} />
      </div>
      <div>
        <h2 className="font-outfit font-semibold text-base text-primary">{title}</h2>
        {description && <p className="font-dm text-[11px] text-soft">{description}</p>}
      </div>
    </div>
  );
}
