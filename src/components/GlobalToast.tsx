import { useEffect } from "react";
import { Music, Info, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import usePlayerStore from "../store/playerStore";

/**
 * 全局 Toast 通知组件
 * - PRD 3.2.5 步骤2：自动切歌时（非播放页）"正在播放: xxx"
 * - PRD 7.1 验收：每个操作有明确视觉反馈
 * - PRD 6 异常处理：网络/播放/登录/数据异常 Toast
 */
export default function GlobalToast() {
  const toast = usePlayerStore((s) => s.toast);
  const clearToast = usePlayerStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => clearToast(), 2500);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  const Icon =
    toast.type === "success"
      ? CheckCircle
      : toast.type === "warning"
        ? AlertCircle
        : toast.type === "error"
          ? XCircle
          : toast.message.startsWith("正在播放")
            ? Music
            : Info;

  const color =
    toast.type === "success"
      ? "#16a34a"
      : toast.type === "warning"
        ? "#d97706"
        : toast.type === "error"
          ? "#dc2626"
          : "var(--accent)";

  return (
    <div
      key={toast.id}
      role="alert"
      aria-live="assertive"
      className="fixed left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
      style={{ bottom: "100px" }}
    >
      <div
        className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl animate-fade-in"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border-strong)",
          backdropFilter: "blur(12px)",
          maxWidth: "90vw",
        }}
      >
        <Icon size={14} style={{ color }} />
        <span className="font-dm text-sm text-primary whitespace-nowrap">
          {toast.message}
        </span>
      </div>
    </div>
  );
}
