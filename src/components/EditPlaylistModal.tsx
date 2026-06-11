import { useEffect, useRef, useState } from "react";
import { X, ImagePlus, Trash2, AlertTriangle } from "lucide-react";
import usePlayerStore from "../store/playerStore";
import {
  PLAYLIST_NAME_MAX,
  PLAYLIST_NAME_MIN,
  PLAYLIST_DESC_MAX,
} from "../types";

/**
 * 编辑歌单弹窗 - PRD 3.4.3
 * - 修改名称（1-30 字）
 * - 修改/上传封面
 * - 修改简介
 * - 删除歌单（二次确认）
 */
export interface EditPlaylistModalProps {
  open: boolean;
  playlistId: string | null;
  onClose: () => void;
}

const COVER_PRESETS = [
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=soft%20pastel%20gradient%20purple%20pink%20album%20cover%20minimalist&image_size=square",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20blue%20teal%20wave%20gradient%20album%20cover%20minimalist&image_size=square",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=warm%20sunset%20orange%20yellow%20gradient%20album%20cover&image_size=square",
  "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=forest%20green%20gradient%20minimalist%20album%20cover&image_size=square",
];

export default function EditPlaylistModal({
  open,
  playlistId,
  onClose,
}: EditPlaylistModalProps) {
  const playlist = usePlayerStore((s) =>
    playlistId ? s.playlists.find((p) => p.id === playlistId) : undefined
  );
  const updatePlaylist = usePlayerStore((s) => s.updatePlaylist);
  const deletePlaylist = usePlayerStore((s) => s.deletePlaylist);
  const showToast = usePlayerStore((s) => s.showToast);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && playlist) {
      setName(playlist.name);
      setDescription(playlist.description ?? "");
      setCover(playlist.cover);
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, playlist]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !playlist) return null;

  const nameTrim = name.trim();
  const nameValid = nameTrim.length >= PLAYLIST_NAME_MIN && nameTrim.length <= PLAYLIST_NAME_MAX;
  const descValid = description.length <= PLAYLIST_DESC_MAX;
  const dirty =
    nameTrim !== playlist.name ||
    (description.trim() || undefined) !== playlist.description ||
    (cover || undefined) !== playlist.cover;
  const canSubmit = nameValid && descValid && dirty;

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

  const handleSave = () => {
    if (!nameValid) {
      setError(`歌单名称需为 ${PLAYLIST_NAME_MIN}-${PLAYLIST_NAME_MAX} 字`);
      return;
    }
    if (!descValid) {
      setError(`简介最多 ${PLAYLIST_DESC_MAX} 字`);
      return;
    }
    updatePlaylist(playlist.id, {
      name: nameTrim,
      description: description.trim() || undefined,
      cover,
    });
    showToast("歌单已更新", "success");
    onClose();
  };

  const handleDelete = () => {
    deletePlaylist(playlist.id);
    showToast(`已删除「${playlist.name}」`, "success");
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
        aria-label="编辑歌单"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-outfit font-bold text-title-sm text-primary">编辑歌单</h3>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="text-soft hover:text-primary clickable-pill"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-caption text-soft mb-1.5">封面</label>
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
                  style={{ background: `url(${url}) center/cover` }}
                  aria-label="选择预设封面"
                />
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-8 h-8 rounded-md flex items-center justify-center clickable-pill"
                style={{ background: "var(--card-soft)", border: "1px dashed var(--border-strong)" }}
                aria-label="上传封面"
              >
                <ImagePlus size={12} className="text-soft" />
              </button>
              {cover && (
                <button
                  onClick={() => setCover(undefined)}
                  className="w-8 h-8 rounded-md flex items-center justify-center clickable-pill"
                  style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
                  aria-label="清除封面"
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

        <div className="mb-3">
          <label className="flex items-center justify-between text-caption text-soft mb-1.5">
            <span>名称</span>
            <span className={nameTrim.length > PLAYLIST_NAME_MAX ? "text-red-500" : ""}>
              {nameTrim.length}/{PLAYLIST_NAME_MAX}
            </span>
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={PLAYLIST_NAME_MAX + 5}
            className="w-full rounded-btn-secondary px-3 py-2 text-body outline-none"
            style={{
              background: "var(--card-soft)",
              border: `1px solid ${nameValid || name.length === 0 ? "var(--border)" : "var(--error)"}`,
              color: "var(--text)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) handleSave();
            }}
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center justify-between text-caption text-soft mb-1.5">
            <span>简介</span>
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

        {!confirmDelete ? (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setConfirmDelete(true)}
              className="clickable-pill inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-caption font-dm transition-colors hover:opacity-80"
              style={{ color: "var(--error)", background: "var(--card-soft)" }}
            >
              <Trash2 size={12} /> 删除歌单
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="clickable-pill px-4 py-2 rounded-btn-pill text-body font-dm text-soft"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!canSubmit}
                className="clickable-pill px-5 py-2 rounded-btn-pill text-body font-dm text-white transition-opacity"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  opacity: canSubmit ? 1 : 0.4,
                }}
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-btn-secondary p-3"
            style={{ background: "var(--card-soft)", border: "1px solid var(--error)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} style={{ color: "var(--error)" }} />
              <span className="font-dm text-body text-primary">
                确定要删除「{playlist.name}」吗？
              </span>
            </div>
            <p className="text-caption text-soft mb-3">
              歌单内的 {playlist.songIds.length} 首歌曲关联将被同时清除，且无法恢复。
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="clickable-pill px-3 py-1.5 rounded-btn-pill text-caption font-dm text-soft"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="clickable-pill px-4 py-1.5 rounded-btn-pill text-caption font-dm text-white"
                style={{ background: "var(--error)" }}
              >
                确认删除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
