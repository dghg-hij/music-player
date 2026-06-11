import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ListMusic, Plus, Search, X } from "lucide-react";
import usePlayerStore from "../store/playerStore";
import { PLAYLIST_MAX_SONGS } from "../types";

/**
 * 加入歌单右侧弹层 - PRD 2.6 弹窗规范 320×400
 *
 * 支持两种入口：
 *   - 单曲加入：mode="single", songIds=[id]
 *   - 批量加入：mode="batch", songIds=[id, id, ...]（E2 评审）
 *
 * 命中已存在歌曲时显示已选标记且不可再点；点击"完成"后调用 store
 * 批量加入接口，返回 added/duplicated/full 给调用方做 Toast。
 */
export interface AddToPlaylistSheetProps {
  open: boolean;
  onClose: () => void;
  /** 传入要加入的歌曲 ID 列表；可单首可多首 */
  songIds: number[];
  /** 单首/批量模式（仅用于标题文案与底部操作按钮） */
  mode?: "single" | "batch";
  onDone?: (result: { playlistId: string; playlistName: string; added: number; duplicated: number; full: boolean }) => void;
}

export default function AddToPlaylistSheet({
  open,
  onClose,
  songIds,
  mode,
  onDone,
}: AddToPlaylistSheetProps) {
  const playlists = usePlayerStore((s) => s.playlists);
  const addSongToPlaylist = usePlayerStore((s) => s.addSongToPlaylist);
  const addSongsToPlaylist = usePlayerStore((s) => s.addSongsToPlaylist);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const showToast = usePlayerStore((s) => s.showToast);

  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isBatch = mode === "batch" || songIds.length > 1;

  useEffect(() => {
    if (open) {
      setKeyword("");
      setCreating(false);
      setNewName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (creating) {
      setTimeout(() => newInputRef.current?.focus(), 30);
    }
  }, [creating]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // 延迟挂载，避免触发打开那一次的 click
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, onClose]);

  const filteredPlaylists = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return playlists;
    return playlists.filter((p) => p.name.toLowerCase().includes(k));
  }, [playlists, keyword]);

  if (!open) return null;

  const handleAdd = (playlistId: string, playlistName: string) => {
    if (isBatch) {
      const res = addSongsToPlaylist(playlistId, songIds);
      if (res.added.length === 0 && res.duplicated.length === songIds.length) {
        showToast("所选歌曲均已在歌单中", "info");
      } else if (res.duplicated.length > 0) {
        showToast(
          `已加入 ${res.added.length} 首，${res.duplicated.length} 首重复`,
          "success"
        );
      } else {
        showToast(`已加入 ${res.added.length} 首到「${playlistName}」`, "success");
      }
      onDone?.({
        playlistId,
        playlistName,
        added: res.added.length,
        duplicated: res.duplicated.length,
        full: false,
      });
    } else {
      const r = addSongToPlaylist(playlistId, songIds[0]);
      if (r.added) showToast(`已加入「${playlistName}」`, "success");
      else if (r.duplicated) showToast("歌曲已在歌单中", "info");
      else if (r.full) showToast("歌单已满（上限 1000 首）", "warning");
      onDone?.({
        playlistId,
        playlistName,
        added: r.added ? 1 : 0,
        duplicated: r.duplicated ? 1 : 0,
        full: r.full,
      });
    }
    onClose();
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const id = createPlaylist({ name });
    // 创建后立即把这首 / 批量歌曲加入
    if (isBatch) {
      addSongsToPlaylist(id, songIds);
    } else {
      addSongToPlaylist(id, songIds[0]);
    }
    showToast(`已创建「${name}」并加入`, "success");
    onDone?.({ playlistId: id, playlistName: name, added: songIds.length, duplicated: 0, full: false });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[65] animate-fade-in"
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        ref={sheetRef}
        className="absolute right-0 top-0 bottom-0 w-[320px] max-w-full flex flex-col animate-slide-up"
        style={{
          background: "var(--card)",
          borderLeft: "1px solid var(--border-strong)",
          boxShadow: "-10px 0 30px -10px rgba(0,0,0,0.3)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="加入歌单"
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <h3 className="font-outfit font-bold text-title-sm text-primary">
              {isBatch ? `批量加入 (${songIds.length})` : "加入歌单"}
            </h3>
            <p className="text-caption text-soft mt-0.5">
              {isBatch ? "选择目标歌单，已存在的歌曲将被自动跳过" : "选择目标歌单"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="text-soft hover:text-primary clickable-pill"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-btn-pill"
            style={{ background: "var(--card-soft)", border: "1px solid var(--border)" }}
          >
            <Search size={14} className="text-soft" />
            <input
              ref={inputRef}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索歌单"
              className="flex-1 bg-transparent outline-none text-body"
              style={{ color: "var(--text)" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filteredPlaylists.length === 0 && !creating && (
            <div className="text-center py-8 text-soft">
              <ListMusic size={28} className="mx-auto mb-2 opacity-50" />
              <p className="text-body">还没有匹配的歌单</p>
              <p className="text-caption mt-1">在下方创建你的第一个歌单</p>
            </div>
          )}

          <div className="space-y-1">
            {filteredPlaylists.map((pl) => {
              const overlap = pl.songIds.filter((id) => songIds.includes(id)).length;
              const full = pl.songIds.length >= PLAYLIST_MAX_SONGS;
              const allExist = overlap === songIds.length;
              return (
                <button
                  key={pl.id}
                  onClick={() => !full && !allExist && handleAdd(pl.id, pl.name)}
                  disabled={full || allExist}
                  className={`w-full flex items-center gap-2 p-2 rounded-btn-icon text-left transition-colors ${
                    full || allExist ? "opacity-50 cursor-not-allowed" : "hover:bg-card-soft cursor-pointer"
                  }`}
                  style={{ color: "var(--text)" }}
                >
                  <div
                    className="w-10 h-10 rounded-cover flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{
                      background: pl.cover
                        ? `url(${pl.cover}) center/cover`
                        : "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    }}
                  >
                    {!pl.cover && <ListMusic size={16} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-dm text-body font-semibold truncate">{pl.name}</p>
                    <p className="text-caption text-soft">
                      {pl.songIds.length}/{PLAYLIST_MAX_SONGS} 首
                      {overlap > 0 && (
                        <span className="ml-1" style={{ color: "var(--accent)" }}>
                          · {overlap} 首已存在
                        </span>
                      )}
                    </p>
                  </div>
                  {allExist && <Check size={14} style={{ color: "var(--accent)" }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="p-3 border-t"
          style={{ borderColor: "var(--border)", background: "var(--card-soft)" }}
        >
          {creating ? (
            <div className="flex gap-2">
              <input
                ref={newInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="新歌单名称"
                className="flex-1 rounded-btn-pill px-3 py-2 text-body outline-none"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                maxLength={30}
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-2 rounded-btn-pill text-body font-dm text-white clickable-pill"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  opacity: newName.trim() ? 1 : 0.4,
                }}
              >
                创建并加入
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-3 py-2 rounded-btn-pill text-body font-dm text-soft clickable-pill"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-btn-pill text-body font-dm text-soft hover:text-primary transition-colors clickable-pill"
              style={{ background: "var(--card)", border: "1px dashed var(--border-strong)" }}
            >
              <Plus size={14} /> 新建歌单
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
