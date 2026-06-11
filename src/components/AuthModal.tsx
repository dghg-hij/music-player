import { useState, useEffect } from "react";
import { X, Phone, KeyRound, User, Shield, Eye, EyeOff, MessageSquare } from "lucide-react";
import useAuthStore from "../store/authStore";
import usePlayerStore from "../store/playerStore";

type LoginTab = "account" | "phone";

export default function AuthModal() {
  const showAuthModal = useAuthStore((s) => s.showAuthModal);
  const authModalView = useAuthStore((s) => s.authModalView);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const showToast = usePlayerStore((s) => s.showToast);

  // 监听模拟短信验证码事件，用 Toast 显示给用户
  useEffect(() => {
    const handler = (e: Event) => {
      const { code } = (e as CustomEvent).detail;
      showToast(`验证码：${code}（模拟短信）`, "info");
    };
    window.addEventListener("auth:sms-code", handler);
    return () => window.removeEventListener("auth:sms-code", handler);
  }, [showToast]);

  // 监听验证码发送失败事件
  useEffect(() => {
    const handler = (e: Event) => {
      const { message } = (e as CustomEvent).detail;
      showToast(message || "验证码发送失败", "error");
    };
    window.addEventListener("auth:sms-error", handler);
    return () => window.removeEventListener("auth:sms-error", handler);
  }, [showToast]);

  // 监听登录失败事件
  useEffect(() => {
    const handler = (e: Event) => {
      const { message } = (e as CustomEvent).detail;
      showToast(message || "登录失败", "error");
    };
    window.addEventListener("auth:login-error", handler);
    return () => window.removeEventListener("auth:login-error", handler);
  }, [showToast]);

  // 监听注册成功事件，提示用户账号名
  useEffect(() => {
    const handler = (e: Event) => {
      const { account } = (e as CustomEvent).detail;
      showToast(`注册成功！你的账号名为：${account}，可用账号密码登录`, "success");
    };
    window.addEventListener("auth:register-success", handler);
    return () => window.removeEventListener("auth:register-success", handler);
  }, [showToast]);

  if (!showAuthModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[400px] mx-4 rounded-3xl overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 25px 60px -12px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 song-row-action"
          aria-label="关闭"
        >
          <X size={18} />
        </button>

        {authModalView === "login" && <LoginView />}
        {authModalView === "register" && <RegisterView />}
        {authModalView === "resetPassword" && <ResetPasswordView />}
      </div>
    </div>
  );
}

function LoginView() {
  const [tab, setTab] = useState<LoginTab>("account");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginByAccount = useAuthStore((s) => s.loginByAccount);
  const loginByPhone = useAuthStore((s) => s.loginByPhone);
  const sendSmsCode = useAuthStore((s) => s.sendSmsCode);
  const smsCountdown = useAuthStore((s) => s.smsCountdown);
  const setAuthModalView = useAuthStore((s) => s.setAuthModalView);

  const handleAccountLogin = async () => {
    if (!account.trim()) { setError("请输入账号"); return; }
    if (!password) { setError("请输入密码"); return; }
    if (!agreed) { setError("请先同意用户协议与隐私政策"); return; }
    setLoading(true);
    setError("");
    // 模拟网络延迟
    await new Promise((r) => setTimeout(r, 500));
    const err = loginByAccount(account.trim(), password);
    if (err) { setError(err); setLoading(false); }
  };

  const handlePhoneLogin = async () => {
    if (!/^1\d{10}$/.test(phone)) { setError("请输入正确的手机号"); return; }
    if (!smsCode || smsCode.length !== 6) { setError("请输入6位验证码"); return; }
    if (!agreed) { setError("请先同意用户协议与隐私政策"); return; }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 500));
    const err = loginByPhone(phone, smsCode);
    if (err) { setError(err); setLoading(false); }
  };

  const handleSendCode = () => {
    if (!/^1\d{10}$/.test(phone)) { setError("请输入正确的手机号"); return; }
    const err = sendSmsCode(phone, "login");
    if (err) setError(err);
    else setError("");
  };

  const handleSubmit = () => {
    if (tab === "account") handleAccountLogin();
    else handlePhoneLogin();
  };

  return (
    <div className="p-8 pt-12" style={{ minHeight: "500px" }}>
      <h2 className="font-outfit font-bold text-2xl text-primary text-center mb-1">
        欢迎回来
      </h2>
      <p className="font-dm text-sm text-soft text-center mb-6">
        登录你的聆音账号
      </p>

      {/* 登录方式切换 */}
      <div className="flex gap-1 p-1 rounded-full mb-6" style={{ background: "var(--card-soft)" }}>
        <button
          onClick={() => { setTab("account"); setError(""); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-dm transition-all duration-200"
          style={tab === "account"
            ? { background: "var(--card)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", color: "var(--accent)" }
            : { color: "var(--text-soft)" }}
        >
          <KeyRound size={14} /> 账号密码
        </button>
        <button
          onClick={() => { setTab("phone"); setError(""); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-dm transition-all duration-200"
          style={tab === "phone"
            ? { background: "var(--card)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", color: "var(--accent)" }
            : { color: "var(--text-soft)" }}
        >
          <Phone size={14} /> 手机验证码
        </button>
      </div>

      {tab === "account" ? (
        <div className="space-y-4">
          <InputField
            icon={<User size={16} />}
            placeholder="账号（4-20位字母数字）"
            value={account}
            onChange={setAccount}
          />
          <div className="relative">
            <InputField
              icon={<KeyRound size={16} />}
              type={showPassword ? "text" : "password"}
              placeholder="密码（8-16位字母数字组合）"
              value={password}
              onChange={setPassword}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-soft transition-colors"
              type="button"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <InputField
            icon={<Phone size={16} />}
            placeholder="手机号"
            value={phone}
            onChange={setPhone}
            maxLength={11}
          />
          <div className="flex gap-2">
            <InputField
              icon={<MessageSquare size={16} />}
              placeholder="验证码"
              value={smsCode}
              onChange={setSmsCode}
              maxLength={6}
            />
            <button
              onClick={handleSendCode}
              disabled={smsCountdown > 0}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-dm transition-all duration-200"
              style={
                smsCountdown > 0
                  ? { background: "var(--card-soft)", color: "var(--text-faint)", cursor: "not-allowed" }
                  : { background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "white" }
              }
            >
              {smsCountdown > 0 ? `${smsCountdown}s` : "获取验证码"}
            </button>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <p className="mt-3 text-xs font-dm text-center" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      {/* 用户协议 */}
      <label className="flex items-center gap-2 mt-5 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="w-4 h-4 rounded accent-current"
          style={{ accentColor: "var(--accent)" }}
        />
        <span className="font-dm text-xs text-soft">
          我已阅读并同意
          <span className="text-accent cursor-pointer" style={{ color: "var(--accent)" }}> 用户协议 </span>
          与
          <span className="text-accent cursor-pointer" style={{ color: "var(--accent)" }}> 隐私政策</span>
        </span>
      </label>

      {/* 登录按钮 */}
      <button
        onClick={handleSubmit}
        disabled={loading || !agreed}
        className="w-full mt-5 py-3 rounded-full text-sm font-dm font-semibold text-white transition-all duration-200"
        style={
          loading || !agreed
            ? { background: "var(--card-soft)", color: "var(--text-faint)", cursor: "not-allowed" }
            : { background: "linear-gradient(135deg, var(--accent), var(--accent-2))", boxShadow: "0 4px 15px -3px var(--accent)" }
        }
      >
        {loading ? "登录中..." : "登录"}
      </button>

      {/* 第三方登录 */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="font-dm text-xs text-faint">其他登录方式</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>
        <div className="flex justify-center gap-4">
          <button className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200" style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }} title="微信登录">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ color: "#07c160" }}>
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.133 0 .241-.108.241-.243 0-.06-.024-.118-.04-.177l-.325-1.233a.492.492 0 01.177-.554C23.025 18.265 24 16.573 24 14.71c0-3.38-3.125-5.852-7.062-5.852zm-2.89 2.76c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.969-.983z"/>
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200" style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }} title="QQ登录">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ color: "#12B7F5" }}>
              <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.396 1.025.116 0 .263-.072.42-.216-.156.578-.197 1.075.013 1.285.29.29.812-.05 1.21-.488a5.6 5.6 0 00-.083.876c0 .7.228 1.044.614 1.044.34 0 .748-.25 1.16-.676.575.636 1.32 1.176 2.264 1.176h3.706c.944 0 1.69-.54 2.264-1.176.412.426.82.676 1.16.676.386 0 .614-.344.614-1.044 0-.298-.03-.59-.083-.876.398.438.92.778 1.21.488.21-.21.17-.707.013-1.285.157.144.304.216.42.216.227 0 .396-.36.396-1.025 0-2.514-2.163-6.954-2.163-6.954V9.325C18.293 3.364 14.268 2 12.003 2z"/>
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200" style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }} title="Apple登录">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ color: "var(--text)" }}>
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 底部切换 */}
      <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => setAuthModalView("resetPassword")}
          className="font-dm text-xs transition-colors"
          style={{ color: "var(--text-soft)" }}
        >
          忘记密码？
        </button>
        <button
          onClick={() => setAuthModalView("register")}
          className="font-dm text-xs font-semibold"
          style={{ color: "var(--accent)" }}
        >
          注册新账号
        </button>
      </div>
    </div>
  );
}

function RegisterView() {
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const register = useAuthStore((s) => s.register);
  const sendSmsCode = useAuthStore((s) => s.sendSmsCode);
  const smsCountdown = useAuthStore((s) => s.smsCountdown);
  const setAuthModalView = useAuthStore((s) => s.setAuthModalView);

  const handleSendCode = () => {
    if (!/^1\d{10}$/.test(phone)) { setError("请输入正确的手机号"); return; }
    const err = sendSmsCode(phone, "register");
    if (err) setError(err);
    else setError("");
  };

  const handleRegister = async () => {
    if (!/^1\d{10}$/.test(phone)) { setError("请输入正确的手机号"); return; }
    if (!smsCode || smsCode.length !== 6) { setError("请输入6位验证码"); return; }
    if (!/^[a-zA-Z0-9]{8,16}$/.test(password)) { setError("密码需8-16位字母数字组合"); return; }
    if (password !== confirmPassword) { setError("两次密码输入不一致"); return; }
    if (!agreed) { setError("请先同意用户协议与隐私政策"); return; }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 500));
    const err = register(phone, smsCode, password);
    if (err) { setError(err); setLoading(false); }
  };

  const passwordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
  };

  const strength = passwordStrength();
  const strengthLabels = ["", "弱", "中", "强", "很强"];
  const strengthColors = ["", "var(--error)", "var(--warning)", "var(--success)", "var(--success)"];

  return (
    <div className="p-8 pt-12" style={{ minHeight: "500px" }}>
      <h2 className="font-outfit font-bold text-2xl text-primary text-center mb-1">
        创建账号
      </h2>
      <p className="font-dm text-sm text-soft text-center mb-6">
        注册你的聆音账号
      </p>

      <div className="space-y-4">
        <InputField
          icon={<Phone size={16} />}
          placeholder="手机号"
          value={phone}
          onChange={setPhone}
          maxLength={11}
        />
        <div className="flex gap-2">
          <InputField
            icon={<MessageSquare size={16} />}
            placeholder="验证码"
            value={smsCode}
            onChange={setSmsCode}
            maxLength={6}
          />
          <button
            onClick={handleSendCode}
            disabled={smsCountdown > 0}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-dm transition-all duration-200"
            style={
              smsCountdown > 0
                ? { background: "var(--card-soft)", color: "var(--text-faint)", cursor: "not-allowed" }
                : { background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "white" }
            }
          >
            {smsCountdown > 0 ? `${smsCountdown}s` : "获取验证码"}
          </button>
        </div>
        <div className="relative">
          <InputField
            icon={<KeyRound size={16} />}
            type={showPassword ? "text" : "password"}
            placeholder="设置密码（8-16位字母数字组合）"
            value={password}
            onChange={setPassword}
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-soft transition-colors"
            type="button"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {password && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full transition-all duration-300"
                  style={{ background: i <= strength ? strengthColors[strength] : "var(--card-soft)" }}
                />
              ))}
            </div>
            <span className="font-dm text-xs" style={{ color: strengthColors[strength] }}>
              {strengthLabels[strength]}
            </span>
          </div>
        )}
        <InputField
          icon={<Shield size={16} />}
          type={showPassword ? "text" : "password"}
          placeholder="确认密码"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>

      {error && (
        <p className="mt-3 text-xs font-dm text-center" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      <label className="flex items-center gap-2 mt-5 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="w-4 h-4 rounded"
          style={{ accentColor: "var(--accent)" }}
        />
        <span className="font-dm text-xs text-soft">
          我已阅读并同意
          <span style={{ color: "var(--accent)" }}> 用户协议 </span>
          与
          <span style={{ color: "var(--accent)" }}> 隐私政策</span>
        </span>
      </label>

      <button
        onClick={handleRegister}
        disabled={loading || !agreed}
        className="w-full mt-5 py-3 rounded-full text-sm font-dm font-semibold text-white transition-all duration-200"
        style={
          loading || !agreed
            ? { background: "var(--card-soft)", color: "var(--text-faint)", cursor: "not-allowed" }
            : { background: "linear-gradient(135deg, var(--accent), var(--accent-2))", boxShadow: "0 4px 15px -3px var(--accent)" }
        }
      >
        {loading ? "注册中..." : "注册"}
      </button>

      <div className="flex items-center justify-center mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <span className="font-dm text-xs text-soft">已有账号？</span>
        <button
          onClick={() => setAuthModalView("login")}
          className="font-dm text-xs font-semibold ml-1"
          style={{ color: "var(--accent)" }}
        >
          去登录
        </button>
      </div>
    </div>
  );
}

function ResetPasswordView() {
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const resetPassword = useAuthStore((s) => s.resetPassword);
  const sendSmsCode = useAuthStore((s) => s.sendSmsCode);
  const smsCountdown = useAuthStore((s) => s.smsCountdown);
  const setAuthModalView = useAuthStore((s) => s.setAuthModalView);

  const handleSendCode = () => {
    if (!/^1\d{10}$/.test(phone)) { setError("请输入正确的手机号"); return; }
    const err = sendSmsCode(phone, "reset");
    if (err) setError(err);
    else setError("");
  };

  const handleReset = async () => {
    if (!/^1\d{10}$/.test(phone)) { setError("请输入正确的手机号"); return; }
    if (!smsCode || smsCode.length !== 6) { setError("请输入6位验证码"); return; }
    if (!/^[a-zA-Z0-9]{8,16}$/.test(newPassword)) { setError("密码需8-16位字母数字组合"); return; }
    if (newPassword !== confirmPassword) { setError("两次密码输入不一致"); return; }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 500));
    const err = resetPassword(phone, smsCode, newPassword);
    if (err) { setError(err); setLoading(false); }
    else { setSuccess(true); setLoading(false); }
  };

  if (success) {
    return (
      <div className="p-8 pt-12 flex flex-col items-center justify-center" style={{ minHeight: "500px" }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <Shield size={28} className="text-white" />
        </div>
        <h2 className="font-outfit font-bold text-xl text-primary mb-2">密码重置成功</h2>
        <p className="font-dm text-sm text-soft mb-6">请使用新密码登录</p>
        <button
          onClick={() => setAuthModalView("login")}
          className="px-8 py-3 rounded-full text-sm font-dm font-semibold text-white transition-all duration-200"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          去登录
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 pt-12" style={{ minHeight: "500px" }}>
      <h2 className="font-outfit font-bold text-2xl text-primary text-center mb-1">
        找回密码
      </h2>
      <p className="font-dm text-sm text-soft text-center mb-6">
        通过手机验证码重置密码
      </p>

      <div className="space-y-4">
        <InputField
          icon={<Phone size={16} />}
          placeholder="手机号"
          value={phone}
          onChange={setPhone}
          maxLength={11}
        />
        <div className="flex gap-2">
          <InputField
            icon={<MessageSquare size={16} />}
            placeholder="验证码"
            value={smsCode}
            onChange={setSmsCode}
            maxLength={6}
          />
          <button
            onClick={handleSendCode}
            disabled={smsCountdown > 0}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-dm transition-all duration-200"
            style={
              smsCountdown > 0
                ? { background: "var(--card-soft)", color: "var(--text-faint)", cursor: "not-allowed" }
                : { background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "white" }
            }
          >
            {smsCountdown > 0 ? `${smsCountdown}s` : "获取验证码"}
          </button>
        </div>
        <div className="relative">
          <InputField
            icon={<KeyRound size={16} />}
            type={showPassword ? "text" : "password"}
            placeholder="新密码（8-16位字母数字组合）"
            value={newPassword}
            onChange={setNewPassword}
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-soft transition-colors"
            type="button"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <InputField
          icon={<Shield size={16} />}
          type={showPassword ? "text" : "password"}
          placeholder="确认新密码"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>

      {error && (
        <p className="mt-3 text-xs font-dm text-center" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleReset}
        disabled={loading}
        className="w-full mt-5 py-3 rounded-full text-sm font-dm font-semibold text-white transition-all duration-200"
        style={
          loading
            ? { background: "var(--card-soft)", color: "var(--text-faint)", cursor: "not-allowed" }
            : { background: "linear-gradient(135deg, var(--accent), var(--accent-2))", boxShadow: "0 4px 15px -3px var(--accent)" }
        }
      >
        {loading ? "重置中..." : "重置密码"}
      </button>

      <div className="flex items-center justify-center mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => setAuthModalView("login")}
          className="font-dm text-xs"
          style={{ color: "var(--accent)" }}
        >
          ← 返回登录
        </button>
      </div>
    </div>
  );
}

function InputField({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  maxLength,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200"
      style={{
        background: "var(--card-soft)",
        border: "1px solid var(--border)",
      }}
    >
      <span className="text-faint flex-shrink-0">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="flex-1 bg-transparent text-primary text-sm font-dm outline-none placeholder:text-faint"
      />
    </div>
  );
}
