import { useEffect, useRef, useState } from "react";
import { X, ImagePlus, Trash2 } from "lucide-react";
import usePlayerStore from "../store/playerStore";
import {
  PLAYLIST_NAME_MAX,
  PLAYLIST_NAME_MIN,
  PLAYLIST_DESC_MAX,
} from "../types";

/**
 * 创建歌单弹窗 - PRD 3.4.1
 * - 弹窗尺寸遵循 PRD 2.6：360×280px（带描述/封面时上下滚动）
 * - 名称实时校验：1-30 字
 * - 简介 0-200 字
 * - 封面可选：本地选择 → objectURL 预览
 * - ESC/点击遮罩关闭
 */
export interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
  /** 创建后是否自动跳转到详情页 */
  goDetail?: boolean;
  /** 创建时立即把指定歌曲加入（用于"歌曲→新建歌单并加入"流程） */
  initialSongId?: number;
  /** 创建后回调 */
  onCreated?: (playlistId: string) => void;
}

const COVER_PRESETS = [
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=soft%20pastel%20gradient%20purple%20pink%20album%20cover%20minimalist&image_size=square",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20blue%20teal%20wave%20gradient%20album%20cover%20minimalist&image_size=square",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=warm%20sunset%20orange%20yellow%20gradient%20album%20cover&image_size=square",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=forest%20green%20gradient%20minimalist%20album%20cover&image_size=square",
];

export default function CreatePlaylistModal({
  open,
  onClose,
  goDetail = false,
  initialSongId,
  onCreated,
}: CreatePlaylistModalProps) {
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const addSongToPlaylist = usePlayerStore((s) => s.addSongToPlaylist);
  const showToast = usePlayerStore((s) => s.showToast);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setCover(undefined);
      setError(null);
      // 聚焦
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const nameTrim = name.trim();
  const nameValid = nameTrim.length >= PLAYLIST_NAME_MIN && nameTrim.length <= PLAYLIST_NAME_MAX;
  const descValid = description.length <= PLAYLIST_DESC_MAX;
  const canSubmit = nameValid && descValid;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("请选择图片文件", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("封面图片不能超过 5MB", "warning");
      return;
    }
    const url = URL.createObjectURL(file);
    setCover(url);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      if (!nameValid) {
        setError(`歌单名称需为 ${PLAYLIST_NAME_MIN}-${PLAYLIST_NAME_MAX} 字`);
      } else if (!descValid) {
        setError(`简介最多 ${PLAYLIST_DESC_MAX} 字`);
      }
      return;
    }
    const id = createPlaylist({ name: nameTrim, description: description.trim() || undefined, cover });
    if (initialSongId !== undefined) {
      const r = addSongToPlaylist(id, initialSongId);
      if (r.added) showToast(`已创建并加入「${nameTrim}」`, "success");
      else if (r.full) showToast("歌单已满（上限 1000 首）", "warning");
      else showToast("歌曲已在歌单中", "info");
    } else {
      showToast(`已创建「${nameTrim}」`, "success");
    }
    onCreated?.(id);
    if (goDetail) {
      window.location.hash = `#/playlist/${id}`;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-[360px] max-w-full max-h-[80vh] overflow-y-auto rounded-card p-5 animate-slide-up"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 20px 50px -10px rgba(0,0,0,0.4)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="创建歌单"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-outfit font-bold text-title-sm text-primary">新建歌单</h3>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="text-soft hover:text-primary clickable-pill"
          >
            <X size={16} />
          </button>
        </div>

        {/* 封面选择 */}
        <div className="mb-3">
          <label className="block text-caption text-soft mb-1.5">封面（可选）</label>
          <div className="flex items-center gap-2">
            <div
              className="w-16 h-16 rounded-cover flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{
                background: cover
                  ? `url(${cover}) center/cover`
                  : "linear-gradient(135deg, var(--accent), var(--accent-2))",
              }}
            >
              {!cover && <ImagePlus size={20} className="text-white/70" />}
            </div>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {COVER_PRESETS.map((url) => (
                <button
                  key={url}
                  onClick={() => setCover(url)}
                  className={`w-8 h-8 rounded-md border-2 clickable-pill ${
                    cover === url ? "border-current" : "border-transparent"
                  }`}
                  style={{
                    background: `url(${url}) center/cover`,
                  }}
                  aria-label="选择预设封面"
                  title="使用此封面"
                />
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-8 h-8 rounded-md flex items-center justify-center clickable-pill"
                style={{ background: "var(--card-soft)", border: "1px dashed var(--border-strong)" }}
                aria-label="上传封面"
                title="上传封面"
              >
                <ImagePlus size={12} className="text-soft" />
              </button>
              {cover && (
                <button
                  onClick={() => setCover(undefined)}
                  className="w-8 h-8 rounded-md flex items-center justify-center clickable-pill"
                  style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
                  aria-label="清除封面"
                  title="清除封面"
                >
                  <Trash2 size={12} className="text-soft" />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* 歌单名称 */}
        <div className="mb-3">
          <label className="flex items-center justify-between text-caption text-soft mb-1.5">
            <span>歌单名称</span>
            <span className={nameTrim.length > PLAYLIST_NAME_MAX ? "text-red-500" : ""}>
              {nameTrim.length}/{PLAYLIST_NAME_MAX}
            </span>
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={PLAYLIST_NAME_MAX + 5}
            placeholder="给我的歌单起个名字"
            className="w-full rounded-btn-secondary px-3 py-2 text-body outline-none"
            style={{
              background: "var(--card-soft)",
              border: `1px solid ${nameValid || name.length === 0 ? "var(--border)" : "var(--error)"}`,
              color: "var(--text)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) handleSubmit();
            }}
          />
        </div>

        {/* 简介 */}
        <div className="mb-4">
          <label className="flex items-center justify-between text-caption text-soft mb-1.5">
            <span>简介（可选）</span>
            <span className={description.length > PLAYLIST_DESC_MAX ? "text-red-500" : ""}>
              {description.length}/{PLAYLIST_DESC_MAX}
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError(null);
            }}
            maxLength={PLAYLIST_DESC_MAX + 50}
            placeholder="介绍一下这个歌单吧"
            rows={2}
            className="w-full rounded-btn-secondary px-3 py-2 text-body outline-none resize-none"
            style={{
              background: "var(--card-soft)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        {error && (
          <p className="text-caption mb-2" style={{ color: "var(--error)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="clickable-pill px-4 py-2 rounded-btn-pill text-body font-dm text-soft"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="clickable-pill px-5 py-2 rounded-btn-pill text-body font-dm text-white transition-opacity"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              opacity: canSubmit ? 1 : 0.4,
            }}
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
