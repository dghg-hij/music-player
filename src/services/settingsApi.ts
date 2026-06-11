/**
 * 模块 8 设置中心 - 后端接口桩
 * 文档：PRD 3.8.5
 *   GET    /api/user/settings     获取用户设置
 *   PUT    /api/user/settings     保存用户设置
 *   POST   /api/feedback          提交问题反馈
 *
 * 当前为前端纯本地实现：返回 localStorage 缓存或直接 resolve，
 * 未来对接真实后端时只需替换此处实现。
 * PRD 4 后端整体设计：当 API_MODE=remote 时，通过 apiClient 调用真实后端。
 */
import type { AppSettings, FeedbackPayload } from "../types";
import { SETTINGS_DEFAULTS as DEFAULTS } from "../types";
import {
  useRemoteApi,
  apiClient,
  USER_ENDPOINTS,
  FEEDBACK_ENDPOINTS,
} from "./apiClient";

const SETTINGS_CACHE_KEY = "music-player-settings";

/** 读取本地缓存的设置（若不存在则用默认值） */
function readLocalSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed, privacy: { ...DEFAULTS.privacy, ...(parsed.privacy || {}) } };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeLocalSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    /* 静默失败 */
  }
}

/** GET /api/user/settings */
export async function fetchUserSettings(): Promise<AppSettings> {
  if (useRemoteApi()) {
    try {
      const res = await apiClient.get<AppSettings>("/user/settings");
      if (res.code === 200 && res.data) return res.data;
    } catch { /* fallback to local */ }
  }
  // 模拟网络延迟，便于前端过渡态展示
  await new Promise((r) => setTimeout(r, 50));
  return readLocalSettings();
}

/** PUT /api/user/settings */
export async function saveUserSettings(settings: AppSettings): Promise<{ success: true }> {
  if (useRemoteApi()) {
    try {
      const res = await apiClient.put<AppSettings>("/user/settings", settings);
      if (res.code === 200) return { success: true };
    } catch { /* fallback to local */ }
  }
  await new Promise((r) => setTimeout(r, 80));
  writeLocalSettings(settings);
  return { success: true };
}

/** POST /api/feedback */
export async function submitFeedback(
  payload: FeedbackPayload
): Promise<{ id: string; success: true }> {
  if (useRemoteApi()) {
    try {
      const res = await apiClient.post<{ id: number }>("/feedback", payload);
      if (res.code === 200 && res.data) return { id: String(res.data.id), success: true };
    } catch { /* fallback to local */ }
  }
  await new Promise((r) => setTimeout(r, 150));
  // 模拟生成反馈 ID；实际后端会落库 t_feedback
  const id = `fb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  // 本地留一份历史，方便用户查看（可选）
  try {
    const key = "music-player-feedbacks";
    const list = JSON.parse(localStorage.getItem(key) || "[]") as Array<
      FeedbackPayload & { id: string; createdAt: number }
    >;
    list.unshift({ ...payload, id, createdAt: Date.now() });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* 静默 */
  }
  return { id, success: true };
}

/** 检查更新（mock） - PRD 3.8.4 */
export async function checkForUpdate(currentVersion: string): Promise<{
  hasUpdate: boolean;
  latestVersion: string;
  releaseNotes?: string;
}> {
  await new Promise((r) => setTimeout(r, 200));
  return {
    hasUpdate: false,
    latestVersion: currentVersion,
    releaseNotes: "已是最新版本",
  };
}
