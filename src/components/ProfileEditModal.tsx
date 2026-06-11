import { useState, useRef } from "react";
import { X, Camera, KeyRound, Shield, Save, Loader2 } from "lucide-react";
import useAuthStore from "../store/authStore";

type Tab = "profile" | "password";

export default function ProfileEditModal() {
  const show = useAuthStore((s) => s.showProfileModal);
  const close = useAuthStore((s) => s.closeProfileModal);
  const user = useAuthStore((s) => s.user);

  if (!show || !user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[480px] mx-4 rounded-3xl overflow-hidden animate-fade-in"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 25px 60px -12px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ProfileBody onClose={close} />
      </div>
    </div>
  );
}

function ProfileBody({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("profile");
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="font-outfit font-bold text-lg text-primary">编辑个人资料</h2>
        <button onClick={onClose} className="song-row-action" aria-label="关闭">
          <X size={18} />
        </button>
      </div>

      <div className="flex gap-1 p-2 mx-5 mt-4 rounded-full" style={{ background: "var(--card-soft)" }}>
        <button
          onClick={() => setTab("profile")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-dm transition-all"
          style={
            tab === "profile"
              ? { background: "var(--card)", color: "var(--accent)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
              : { color: "var(--text-soft)" }
          }
        >
          <Camera size={14} /> 资料
        </button>
        <button
          onClick={() => setTab("password")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-dm transition-all"
          style={
            tab === "password"
              ? { background: "var(--card)", color: "var(--accent)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
              : { color: "var(--text-soft)" }
          }
        >
          <KeyRound size={14} /> 密码
        </button>
      </div>

      <div className="p-5 pt-4">{tab === "profile" ? <ProfileForm /> : <PasswordForm />}</div>

      <p className="font-dm text-xs text-faint text-center px-5 pb-4">
        UID: {user?.uid}
      </p>
    </div>
  );
}

function ProfileForm() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const close = useAuthStore((s) => s.closeProfileModal);

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [signature, setSignature] = useState(user?.signature ?? "");
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickAvatar = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("图片大小不能超过 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(typeof reader.result === "string" ? reader.result : undefined);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError("");
    if (!nickname.trim()) {
      setError("昵称不能为空");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    const err = updateProfile({
      nickname: nickname.trim(),
      signature,
      avatar: avatar === user?.avatar ? user.avatar : avatar,
    });
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setToast("资料已更新");
      setTimeout(() => {
        close();
      }, 600);
    }
  };

  return (
    <div className="space-y-4">
      {/* 头像 */}
      <div className="flex flex-col items-center gap-3 py-2">
        <button
          onClick={handlePickAvatar}
          className="relative w-24 h-24 rounded-full overflow-hidden transition-all"
          style={{
            background: avatar
              ? undefined
              : "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent)",
          }}
        >
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-white text-3xl font-dm font-bold">
              {user?.nickname.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span
            className="absolute inset-0 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.45)" }}
          >
            <Camera size={20} />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="font-dm text-xs text-faint">点击更换头像（≤2MB）</p>
      </div>

      {/* 昵称 */}
      <div>
        <label className="font-dm text-xs text-soft block mb-1.5">昵称（2-20 字）</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-dm text-primary outline-none border border-default focus:border-accent transition-colors"
          style={{ background: "var(--card-soft)" }}
        />
      </div>

      {/* 签名 */}
      <div>
        <label className="font-dm text-xs text-soft block mb-1.5">
          个性签名（0-100 字）· 已输入 {signature.length}
        </label>
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value.slice(0, 100))}
          rows={3}
          placeholder="说点什么吧..."
          className="w-full px-4 py-2.5 rounded-xl text-sm font-dm text-primary outline-none border border-default focus:border-accent resize-none transition-colors"
          style={{ background: "var(--card-soft)" }}
        />
      </div>

      {error && (
        <p className="text-xs font-dm" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3 rounded-full text-sm font-dm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-1.5"
        style={
          loading
            ? { background: "var(--card-soft)", color: "var(--text-faint)", cursor: "not-allowed" }
            : {
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                boxShadow: "0 4px 15px -3px var(--accent)",
              }
        }
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        保存资料
      </button>

      {toast && (
        <p
          className="text-xs font-dm text-center py-2 rounded-full"
          style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}
        >
          {toast}
        </p>
      )}
    </div>
  );
}

function PasswordForm() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const close = useAuthStore((s) => s.closeProfileModal);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!oldPassword) return setError("请输入原密码");
    if (!/^[a-zA-Z0-9]{8,16}$/.test(newPassword)) return setError("新密码需 8-16 位字母数字组合");
    if (newPassword !== confirmPassword) return setError("两次密码输入不一致");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    const err = changePassword(oldPassword, newPassword);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setToast("密码已更新");
      setTimeout(() => close(), 600);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "color-mix(in srgb, var(--warning) 8%, transparent)" }}>
        <Shield size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--warning)" }} />
        <p className="font-dm text-xs text-soft">
          修改密码后，下次登录请使用新密码。建议 8-16 位字母与数字组合。
        </p>
      </div>

      <PasswordField
        label="原密码"
        value={oldPassword}
        onChange={setOldPassword}
        show={showOld}
        onToggle={() => setShowOld(!showOld)}
      />
      <PasswordField
        label="新密码（8-16 位字母数字组合）"
        value={newPassword}
        onChange={setNewPassword}
        show={showNew}
        onToggle={() => setShowNew(!showNew)}
      />
      <PasswordField
        label="确认新密码"
        value={confirmPassword}
        onChange={setConfirmPassword}
        show={showNew}
        onToggle={() => setShowNew(!showNew)}
      />

      {error && (
        <p className="text-xs font-dm" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3 rounded-full text-sm font-dm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-1.5"
        style={
          loading
            ? { background: "var(--card-soft)", color: "var(--text-faint)", cursor: "not-allowed" }
            : {
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                boxShadow: "0 4px 15px -3px var(--accent)",
              }
        }
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        更新密码
      </button>

      {toast && (
        <p
          className="text-xs font-dm text-center py-2 rounded-full"
          style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}
        >
          {toast}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="font-dm text-xs text-soft block mb-1.5">{label}</label>
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
        style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
      >
        <KeyRound size={14} className="text-faint flex-shrink-0" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-primary text-sm font-dm outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          className="text-faint hover:text-soft transition-colors text-xs"
        >
          {show ? "隐藏" : "显示"}
        </button>
      </div>
    </div>
  );
}
