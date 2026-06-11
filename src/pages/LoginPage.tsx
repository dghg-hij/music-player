import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Music2 } from "lucide-react";
import useAuthStore from "../store/authStore";
import usePlayerStore from "../store/playerStore";

/**
 * 手机端登录页面
 * - 复用 AuthModal 实现登录/注册/忘记密码
 * - 顶部返回按钮，回到上一页或 /my
 * - 登录成功后自动返回
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const showToast = usePlayerStore((s) => s.showToast);
  const [hasOpened, setHasOpened] = useState(false);

  // 进入页面：自动打开登录弹窗
  useEffect(() => {
    if (!hasOpened && !isLoggedIn) {
      openAuthModal("login");
      setHasOpened(true);
    }
  }, [hasOpened, isLoggedIn, openAuthModal]);

  // 登录成功：跳回个人中心
  useEffect(() => {
    if (isLoggedIn && hasOpened) {
      showToast("登录成功", "success");
      navigate("/my", { replace: true });
    }
  }, [isLoggedIn, hasOpened, navigate, showToast]);

  // 如果用户已登录，直接跳回 /my
  useEffect(() => {
    if (isLoggedIn) {
      navigate("/my", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          boxShadow: "0 8px 24px -4px color-mix(in srgb, var(--accent) 40%, transparent)",
        }}
      >
        <Music2 size={28} className="text-white" strokeWidth={2.5} />
      </div>
      <h1 className="font-outfit font-bold text-2xl text-primary text-center">
        登录聆音
      </h1>
      <p className="font-dm text-sm text-soft text-center max-w-sm">
        登录后可同步你的偏好、收藏、歌单与播放记录。
      </p>

      <button
        onClick={() => {
          openAuthModal("login");
        }}
        className="px-6 py-2.5 rounded-full text-sm font-dm font-semibold text-white transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          boxShadow: "0 4px 15px -3px color-mix(in srgb, var(--accent) 50%, transparent)",
        }}
      >
        打开登录
      </button>

      <button
        onClick={() => {
          closeAuthModal();
          navigate(-1);
        }}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-dm text-soft hover:text-primary transition-colors mt-2"
        style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
      >
        <ChevronLeft size={12} /> 返回
      </button>
    </div>
  );
}
