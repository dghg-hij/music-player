import { WifiOff } from "lucide-react";
import usePlayerStore from "../store/playerStore";

/**
 * PRD 6.1 网络异常：显示网络断开提示横幅
 * - 网络状态监听和 Toast/暂停逻辑已由 useAudioPlayer 统一处理
 * - 此组件仅负责 UI 展示（断网横幅）
 */
export default function NetworkStatus() {
  const isOnline = usePlayerStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-2xl animate-fade-in"
      style={{
        background: "color-mix(in srgb, var(--warning) 15%, var(--card))",
        border: "1px solid color-mix(in srgb, var(--warning) 40%, var(--border))",
      }}
    >
      <WifiOff size={14} style={{ color: "var(--warning)" }} />
      <span className="font-dm text-sm text-primary">网络已断开</span>
    </div>
  );
}
