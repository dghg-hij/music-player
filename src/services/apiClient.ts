/**
 * 统一后端 API 客户端层
 * 基于 PRD 第 4 章（后端整体设计）
 *
 * 包含：
 *  - API 响应格式与错误码（PRD 4.2）
 *  - 分页参数（PRD 4.2）
 *  - ApiHttpClient：请求/响应拦截、Token 管理、限流、去重、缓存
 *  - Token 管理与刷新（PRD 4.2 / 6.3）
 *  - 客户端限流（PRD 4.7）
 *  - 内存缓存层（PRD 4.4）
 *  - 数据库类型定义（PRD 4.3）
 *  - API 端点常量
 *  - 当前模式标志（mock / remote）
 */

// ============================================================
// 1. API 响应格式 — PRD 4.2
// ============================================================

/** 统一 API 响应格式 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/** 分页请求参数 — PRD 4.2 */
export interface PaginationParams {
  /** 页码，从 1 开始，默认 1 */
  page?: number;
  /** 每页条数，默认 20 */
  size?: number;
}

/** 分页响应元数据 */
export interface PaginationMeta {
  page: number;
  size: number;
  total: number;
}

/** 分页响应包装 */
export interface PaginatedResponse<T> {
  list: T[];
  pagination: PaginationMeta;
}

// ============================================================
// 2. 错误码 — PRD 4.2
// ============================================================

export const ErrorCode = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 错误码 → 默认消息映射 */
export const ERROR_MESSAGES: Record<number, string> = {
  [ErrorCode.SUCCESS]: "请求成功",
  [ErrorCode.BAD_REQUEST]: "请求参数错误",
  [ErrorCode.UNAUTHORIZED]: "未授权，请先登录",
  [ErrorCode.FORBIDDEN]: "无权限访问",
  [ErrorCode.NOT_FOUND]: "资源不存在",
  [ErrorCode.TOO_MANY_REQUESTS]: "请求过于频繁，请稍后再试",
  [ErrorCode.SERVER_ERROR]: "服务器内部错误",
};

// ============================================================
// 3. Token 管理 — PRD 4.2 / 6.3
// ============================================================

const ACCESS_TOKEN_KEY = "music-player-access-token";
const REFRESH_TOKEN_KEY = "music-player-refresh-token";
const TOKEN_EXPIRE_KEY = "music-player-token-expire";

/** Refresh Token 有效期：30 天（毫秒） */
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;

/** Access Token 提前刷新阈值：过期前 5 分钟 */
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;

/** Token 管理器 */
export const TokenManager = {
  /** 获取 Access Token */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /** 设置 Access Token */
  setAccessToken(token: string, expiresInMs: number): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRE_KEY, String(Date.now() + expiresInMs));
  },

  /** 获取 Refresh Token */
  getRefreshToken(): string | null {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!token) return null;
    // 检查 Refresh Token 是否仍在 30 天有效期内
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY + ":expire");
    if (stored && Number(stored) <= Date.now()) {
      TokenManager.clearAll();
      return null;
    }
    return token;
  },

  /** 设置 Refresh Token */
  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY + ":expire", String(Date.now() + REFRESH_TOKEN_TTL));
  },

  /** 判断 Access Token 是否即将过期 */
  isTokenExpiringSoon(): boolean {
    const expireStr = localStorage.getItem(TOKEN_EXPIRE_KEY);
    if (!expireStr) return true;
    return Date.now() + TOKEN_REFRESH_THRESHOLD >= Number(expireStr);
  },

  /** 清除所有 Token */
  clearAll(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY + ":expire");
  },
};

// ============================================================
// 4. 客户端限流 — PRD 4.7
// ============================================================

/** 限流配置 */
export interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
}

/** 限流规则 — PRD 4.7 */
export const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
  /** 普通 API：60 次/分钟 */
  normal: { windowMs: 60 * 1000, maxRequests: 60 },
  /** 搜索 API：30 次/分钟 */
  search: { windowMs: 60 * 1000, maxRequests: 30 },
  /** 短信 API：1 次/分钟 */
  sms: { windowMs: 60 * 1000, maxRequests: 1 },
};

/** 限流记录条目 */
interface RateLimitEntry {
  timestamps: number[];
}

/** 客户端限流器 */
export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private queue = new Map<string, Array<{ resolve: (value: boolean) => void }>>();

  /**
   * 判断某个 key 是否可以发起请求
   * @returns true=允许, false=被限流
   */
  canProceed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.entries.set(key, entry);
    }
    // 清理过期时间戳
    entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);
    if (entry.timestamps.length < config.maxRequests) {
      entry.timestamps.push(now);
      return true;
    }
    return false;
  }

  /**
   * 获取某个 key 的限流等待时间（毫秒），0 表示无需等待
   */
  getWaitTime(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry) return 0;
    const validTimestamps = entry.timestamps.filter((t) => now - t < config.windowMs);
    if (validTimestamps.length < config.maxRequests) return 0;
    // 最早的时间戳 + windowMs - now
    const oldest = Math.min(...validTimestamps);
    return Math.max(0, oldest + config.windowMs - now);
  }

  /**
   * 排队等待直到可以发起请求
   * @returns Promise<true> 允许发起；Promise<false> 队列超时
   */
  async waitUntilAllowed(key: string, config: RateLimitConfig, timeoutMs: number = 30000): Promise<boolean> {
    if (this.canProceed(key, config)) return true;
    const waitTime = this.getWaitTime(key, config);
    if (waitTime <= 0) return true;
    if (waitTime > timeoutMs) return false;
    return new Promise<boolean>((resolve) => {
      let queue = this.queue.get(key);
      if (!queue) {
        queue = [];
        this.queue.set(key, queue);
      }
      queue.push({ resolve });
      // 设置超时
      setTimeout(() => {
        const q = this.queue.get(key);
        if (q) {
          const idx = q.findIndex((item) => item.resolve === resolve);
          if (idx >= 0) q.splice(idx, 1);
        }
        resolve(false);
      }, timeoutMs);
      // 在等待时间后尝试处理队列
      setTimeout(() => this.processQueue(key, config), waitTime);
    });
  }

  /** 处理排队中的请求 */
  private processQueue(key: string, config: RateLimitConfig): void {
    const queue = this.queue.get(key);
    if (!queue || queue.length === 0) return;
    while (queue.length > 0 && this.canProceed(key, config)) {
      const item = queue.shift();
      item?.resolve(true);
    }
    if (queue.length === 0) {
      this.queue.delete(key);
    }
  }

  /** 重置某个 key 的限流记录 */
  reset(key: string): void {
    this.entries.delete(key);
    const queue = this.queue.get(key);
    if (queue) {
      queue.forEach((item) => item.resolve(false));
      this.queue.delete(key);
    }
  }
}

/** 全局限流器实例 */
export const rateLimiter = new RateLimiter();

// ============================================================
// 5. 内存缓存层 — PRD 4.4
// ============================================================

/** 缓存条目 */
interface CacheEntry<T> {
  data: T;
  expireAt: number;
}

/** 缓存 TTL 配置 — PRD 4.4 */
export const CACHE_TTL_CONFIG: Record<string, number> = {
  /** 热门歌曲 → 10 分钟 */
  "hot:songs": 10 * 60 * 1000,
  /** 热门搜索 → 30 分钟 */
  "hot:search": 30 * 60 * 1000,
  /** 搜索联想 → 5 分钟 */
  "search:suggest": 5 * 60 * 1000,
  /** 搜索结果 → 10 分钟 */
  "search:result": 10 * 60 * 1000,
  /** 每日推荐 → 6 小时 */
  "recommend:daily": 6 * 60 * 60 * 1000,
  /** 私人 FM → 30 分钟 */
  "recommend:fm": 30 * 60 * 1000,
  /** 歌曲详情 → 1 小时 */
  "song:detail": 60 * 60 * 1000,
  /** 歌词 → 24 小时 */
  "song:lyrics": 24 * 60 * 60 * 1000,
  /** 歌单详情 → 30 分钟 */
  "playlist:detail": 30 * 60 * 1000,
  /** 用户设置 → 无过期（变更时主动更新） */
  "user:settings": Infinity,
  /** 用户信息 → 1 小时 */
  "user:info": 60 * 60 * 1000,
  /** 排行榜 → 1 小时 */
  "rank": 60 * 60 * 1000,
};

/** 内存缓存管理器 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  /** 定期清理计时器 */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 每 5 分钟清理过期缓存
    this.cleanupTimer = setInterval(() => this.evictExpired(), 5 * 60 * 1000);
  }

  /**
   * 生成缓存 key
   * @param prefix 缓存前缀（如 "song:detail"）
   * @param suffix 后缀（如歌曲 ID）
   */
  static makeKey(prefix: string, suffix?: string | number): string {
    return suffix !== undefined ? `${prefix}:${suffix}` : prefix;
  }

  /** 获取缓存，过期或不存在返回 null */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expireAt !== Infinity && Date.now() >= entry.expireAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /** 写入缓存，TTL 从 CACHE_TTL_CONFIG 取；也可手动指定 */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const prefix = key.includes(":") ? key.substring(0, key.lastIndexOf(":")) : key;
    const ttl = ttlMs ?? CACHE_TTL_CONFIG[prefix] ?? 5 * 60 * 1000;
    this.cache.set(key, {
      data,
      expireAt: ttl === Infinity ? Infinity : Date.now() + ttl,
    });
  }

  /** 删除指定缓存 */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** 按前缀批量删除缓存 */
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key === prefix || key.startsWith(prefix + ":")) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /** 清除所有缓存 */
  clear(): void {
    this.cache.clear();
  }

  /** 清理过期条目 */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expireAt !== Infinity && now >= entry.expireAt) {
        this.cache.delete(key);
      }
    }
  }

  /** 销毁清理计时器 */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

/** 全局缓存实例 */
export const apiCache = new MemoryCache();

// ============================================================
// 6. 请求去重
// ============================================================

/** 进行中的请求映射（用于去重） */
const pendingRequests = new Map<string, Promise<ApiResponse<unknown>>>();

/** 生成请求去重 key */
function makeDedupeKey(method: string, url: string, body?: unknown): string {
  const bodyHash = body ? JSON.stringify(body) : "";
  return `${method.toUpperCase()}:${url}:${bodyHash}`;
}

// ============================================================
// 7. 拦截器
// ============================================================

/** 请求拦截器 */
export type RequestInterceptor = (
  url: string,
  options: RequestInit
) => { url: string; options: RequestInit } | Promise<{ url: string; options: RequestInit }>;

/** 响应拦截器 */
export type ResponseInterceptor = (
  response: Response,
  data: ApiResponse<unknown>
) => ApiResponse<unknown> | Promise<ApiResponse<unknown>>;

// ============================================================
// 8. ApiHttpClient — 核心请求客户端
// ============================================================

/** 客户端配置 */
export interface ApiHttpClientConfig {
  /** 基础 URL，可通过环境变量 VITE_API_BASE_URL 配置 */
  baseURL: string;
  /** 请求超时（毫秒），默认 10000 */
  timeout: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: ApiHttpClientConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 10000,
};

export class ApiHttpClient {
  private config: ApiHttpClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(config?: Partial<ApiHttpClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupDefaultInterceptors();
  }

  /** 注册默认拦截器：Token 注入、401 处理、403 处理、429 重试 */
  private setupDefaultInterceptors(): void {
    // 请求拦截：自动注入 Authorization
    this.requestInterceptors.push((url, options) => {
      const token = TokenManager.getAccessToken();
      if (token) {
        const headers = new Headers(options.headers);
        headers.set("Authorization", `Bearer ${token}`);
        options.headers = headers;
      }
      return { url, options };
    });

    // 响应拦截：处理 401 / 403 / 429
    this.responseInterceptors.push(async (response, data) => {
      if (response.status === ErrorCode.UNAUTHORIZED) {
        // 尝试刷新 Token
        const refreshed = await this.handleTokenRefresh();
        if (!refreshed) {
          TokenManager.clearAll();
          // 触发跳转到登录页
          this.redirectToLogin();
        }
      }

      if (response.status === ErrorCode.FORBIDDEN) {
        // 检查是否为会员权限问题
        const msg = data?.message || "";
        if (msg.includes("会员") || msg.includes("member") || msg.includes("VIP") || msg.includes("SVIP")) {
          data.message = "当前功能需要开通会员";
        }
      }

      return data;
    });
  }

  /** 处理 Token 刷新 */
  private async handleTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing) {
      // 已有刷新请求进行中，排队等待
      return new Promise<boolean>((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          resolve(!!token);
        });
      });
    }

    this.isRefreshing = true;
    const refreshToken = TokenManager.getRefreshToken();

    if (!refreshToken) {
      this.isRefreshing = false;
      this.refreshSubscribers = [];
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      const res = await fetch(`${this.config.baseURL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        TokenManager.clearAll();
        this.notifyRefreshSubscribers(null);
        return false;
      }

      const json: ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }> = await res.json();
      if (json.code !== ErrorCode.SUCCESS || !json.data) {
        TokenManager.clearAll();
        this.notifyRefreshSubscribers(null);
        return false;
      }

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = json.data;
      TokenManager.setAccessToken(accessToken, expiresIn);
      TokenManager.setRefreshToken(newRefreshToken);
      this.notifyRefreshSubscribers(accessToken);
      return true;
    } catch {
      TokenManager.clearAll();
      this.notifyRefreshSubscribers(null);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /** 通知所有等待刷新的订阅者 */
  private notifyRefreshSubscribers(token: string | null): void {
    this.refreshSubscribers.forEach((cb) => cb(token || ""));
    this.refreshSubscribers = [];
  }

  /** 跳转到登录页 */
  private redirectToLogin(): void {
    // 通过 authStore 的 openAuthModal 触发登录弹窗
    // 避免在此处直接 import store（循环依赖），使用事件机制
    window.dispatchEvent(new CustomEvent("api:unauthorized"));
  }

  /** 添加请求拦截器 */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /** 添加响应拦截器 */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /** 移除请求拦截器 */
  removeRequestInterceptor(interceptor: RequestInterceptor): void {
    const idx = this.requestInterceptors.indexOf(interceptor);
    if (idx >= 0) this.requestInterceptors.splice(idx, 1);
  }

  /** 移除响应拦截器 */
  removeResponseInterceptor(interceptor: ResponseInterceptor): void {
    const idx = this.responseInterceptors.indexOf(interceptor);
    if (idx >= 0) this.responseInterceptors.splice(idx, 1);
  }

  /** 核心请求方法 */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>,
    options?: { skipCache?: boolean; cacheKey?: string; cacheTtl?: number; rateLimitKey?: string; rateLimitRule?: string }
  ): Promise<ApiResponse<T>> {
    const { skipCache = false, cacheKey, cacheTtl, rateLimitKey, rateLimitRule } = options || {};

    // 1. 限流检查
    if (rateLimitKey && rateLimitRule) {
      const config = RATE_LIMIT_RULES[rateLimitRule];
      if (config) {
        const allowed = await rateLimiter.waitUntilAllowed(rateLimitKey, config);
        if (!allowed) {
          return this.createErrorResponse<T>(ErrorCode.TOO_MANY_REQUESTS, ERROR_MESSAGES[ErrorCode.TOO_MANY_REQUESTS]);
        }
      }
    }

    // 2. 缓存检查（仅 GET 请求）
    if (method.toUpperCase() === "GET" && !skipCache && cacheKey) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached !== null) {
        return this.createSuccessResponse(cached);
      }
    }

    // 3. 请求去重
    const url = this.buildURL(path, params);
    const dedupeKey = makeDedupeKey(method, url, body);
    const existing = pendingRequests.get(dedupeKey);
    if (existing) {
      return existing as Promise<ApiResponse<T>>;
    }

    // 4. 构建请求
    const requestPromise = this.executeRequest<T>(method, url, body, cacheKey, cacheTtl, skipCache);
    pendingRequests.set(dedupeKey, requestPromise as Promise<ApiResponse<unknown>>);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      pendingRequests.delete(dedupeKey);
    }
  }

  /** 执行实际请求 */
  private async executeRequest<T>(
    method: string,
    url: string,
    body: unknown,
    cacheKey?: string,
    cacheTtl?: number,
    skipCache?: boolean
  ): Promise<ApiResponse<T>> {
    // 构建请求选项
    const options: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body !== undefined && method.toUpperCase() !== "GET") {
      options.body = JSON.stringify(body);
    }

    // 运行请求拦截器
    let interceptedUrl = url;
    let interceptedOptions = options;
    for (const interceptor of this.requestInterceptors) {
      const result = await interceptor(interceptedUrl, interceptedOptions);
      interceptedUrl = result.url;
      interceptedOptions = result.options;
    }

    // 超时控制
    const controller = new AbortController();
    interceptedOptions.signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    let response: Response;
    try {
      response = await fetch(interceptedUrl, interceptedOptions);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === "AbortError") {
        return this.createErrorResponse<T>(ErrorCode.SERVER_ERROR, "请求超时");
      }
      return this.createErrorResponse<T>(ErrorCode.SERVER_ERROR, "网络错误，请检查网络连接");
    } finally {
      clearTimeout(timeoutId);
    }

    // 解析响应
    let data: ApiResponse<T>;
    try {
      const json = await response.json();
      data = json as ApiResponse<T>;
    } catch {
      data = this.createErrorResponse<T>(
        response.status as ErrorCodeType,
        ERROR_MESSAGES[response.status] || "未知错误"
      );
    }

    // 运行响应拦截器
    for (const interceptor of this.responseInterceptors) {
      data = await interceptor(response, data as ApiResponse<unknown>) as ApiResponse<T>;
    }

    // 429 重试
    if (response.status === ErrorCode.TOO_MANY_REQUESTS) {
      const retryAfter = response.headers.get("Retry-After");
      const retryMs = retryAfter ? Number(retryAfter) * 1000 : 5000;
      if (retryMs <= 30000) {
        await new Promise((r) => setTimeout(r, retryMs));
        return this.executeRequest<T>(method, url, body, cacheKey, cacheTtl, skipCache);
      }
    }

    // 缓存写入（仅 GET + 成功响应）
    if (
      method.toUpperCase() === "GET" &&
      !skipCache &&
      cacheKey &&
      (data.code === ErrorCode.SUCCESS)
    ) {
      apiCache.set(cacheKey, data.data, cacheTtl);
    }

    return data;
  }

  /** 构建完整 URL */
  private buildURL(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const base = `${this.config.baseURL}${path}`;
    if (!params) return base;
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return qs ? `${base}?${qs}` : base;
  }

  /** 创建成功响应 */
  private createSuccessResponse<T>(data: T): ApiResponse<T> {
    return {
      code: ErrorCode.SUCCESS,
      message: ERROR_MESSAGES[ErrorCode.SUCCESS],
      data,
      timestamp: Date.now(),
    };
  }

  /** 创建错误响应 */
  private createErrorResponse<T>(code: number, message: string): ApiResponse<T> {
    return {
      code,
      message,
      data: null as T,
      timestamp: Date.now(),
    };
  }

  // ---- 公开 HTTP 方法 ----

  /** GET 请求 */
  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: { skipCache?: boolean; cacheKey?: string; cacheTtl?: number; rateLimitKey?: string; rateLimitRule?: string }
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path, undefined, params, options);
  }

  /** POST 请求 */
  async post<T>(
    path: string,
    body?: unknown,
    options?: { rateLimitKey?: string; rateLimitRule?: string }
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", path, body, undefined, options);
  }

  /** PUT 请求 */
  async put<T>(
    path: string,
    body?: unknown,
    options?: { rateLimitKey?: string; rateLimitRule?: string }
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", path, body, undefined, options);
  }

  /** DELETE 请求 */
  async delete<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: { rateLimitKey?: string; rateLimitRule?: string }
  ): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", path, undefined, params, options);
  }

  /** 获取基础 URL */
  getBaseURL(): string {
    return this.config.baseURL;
  }

  /** 更新基础 URL */
  setBaseURL(url: string): void {
    this.config.baseURL = url;
  }
}

/** 全局 API 客户端实例 */
export const apiClient = new ApiHttpClient();

// ============================================================
// 9. 数据库类型定义 — PRD 4.3
// ============================================================

/** t_user — 用户表 PRD 4.3.1 */
export interface TUser {
  uid: string;
  phone: string;
  account: string;
  password: string;
  nickname: string;
  avatar: string;
  signature: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/** t_song — 歌曲表 PRD 4.3.2
 * 注意：D1 评审修正 — 不存储各音质 URL，音质 URL 由后端动态生成 */
export interface TSong {
  id: number;
  neteaseId: number;
  title: string;
  artistId: string;
  albumId: string;
  duration: number;
  cover: string;
  /** 歌词原文（LRC 格式） */
  lyrics: string;
  /** 翻译歌词 */
  lyricsTranslation: string;
  /** 是否为付费歌曲 */
  isPaid: 0 | 1;
  /** 热度值 */
  heat: number;
  /** 流派标签 */
  genre: string;
  /** 语种 */
  language: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/** t_album — 专辑表 PRD 4.3.3 */
export interface TAlbum {
  id: string;
  name: string;
  artistId: string;
  cover: string;
  releaseDate: string;
  songCount: number;
  description: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/** t_artist — 歌手表 PRD 4.3.4 */
export interface TArtist {
  id: string;
  name: string;
  avatar: string;
  songCount: number;
  albumCount: number;
  description: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/** t_playlist — 歌单表 PRD 4.3.5 */
export interface TPlaylist {
  id: string;
  name: string;
  cover: string;
  description: string;
  creatorUid: string;
  songCount: number;
  playCount: number;
  isPublic: 0 | 1;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/** t_playlist_song — 歌单歌曲关联表 PRD 4.3.6 */
export interface TPlaylistSong {
  id: number;
  playlistId: string;
  songId: number;
  sortOrder: number;
  addedAt: number;
}

/** t_collection — 收藏表 PRD 4.3.7 */
export interface TCollection {
  id: number;
  uid: string;
  targetType: "playlist" | "song";
  targetId: string;
  createdAt: number;
}

/** t_play_history — 播放历史表 PRD 4.3.8
 * 注意：D3 评审修正 — 使用 upsert 逻辑（同歌曲覆盖更新） */
export interface TPlayHistory {
  id: number;
  uid: string;
  songId: number;
  playCount: number;
  progress: number;
  lastPlayedAt: number;
}

/** t_user_settings — 用户设置表 PRD 4.3.9 */
export interface TUserSettings {
  uid: string;
  cacheSize: number;
  playbackRate: number;
  quality: string;
  autoPlay: 0 | 1;
  theme: string;
  lyricFontSize: number;
  lyricTranslation: 0 | 1;
  publicHistory: 0 | 1;
  allowRecommend: 0 | 1;
  updatedAt: number;
}

/** t_member — 会员表 PRD 4.3.10 */
export interface TMember {
  uid: string;
  level: string;
  expireTime: number;
  autoRenew: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

/** t_order — 订单表 PRD 4.3.11 */
export interface TOrder {
  orderNo: string;
  uid: string;
  planId: string;
  level: string;
  cycle: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: number;
  paidAt: number | null;
  effectiveUntil: number | null;
}

/** t_feedback — 反馈表 PRD 4.3.12 */
export interface TFeedback {
  id: number;
  uid: string;
  content: string;
  contact: string;
  screenshot: string;
  status: string;
  createdAt: number;
}

/** t_search_log — 搜索日志表 PRD 4.3.13 */
export interface TSearchLog {
  id: number;
  uid: string;
  keyword: string;
  resultCount: number;
  createdAt: number;
}

/** t_oauth — 第三方授权表 PRD 4.3（D2 评审新增） */
export interface TOAuth {
  id: number;
  uid: string;
  provider: string;
  providerUid: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// 10. API 端点常量
// ============================================================

/** 认证相关端点 */
export const AUTH_ENDPOINTS = {
  /** 账号密码登录 */
  LOGIN: "/api/auth/login",
  /** 短信验证码登录 */
  LOGIN_SMS: "/api/auth/login/sms",
  /** 发送短信验证码 */
  SMS_SEND: "/api/auth/sms/send",
  /** 注册 */
  REGISTER: "/api/auth/register",
  /** 重置密码 */
  PASSWORD_RESET: "/api/auth/password/reset",
  /** 登出 */
  LOGOUT: "/api/auth/logout",
  /** 获取当前用户信息 */
  USER_INFO: "/api/user/info",
} as const;

/** 歌曲相关端点 */
export const SONG_ENDPOINTS = {
  /** 获取播放 URL（动态生成，不缓存） */
  PLAY_URL: "/api/song/play-url",
  /** 获取歌词 */
  LYRICS: "/api/song/lyrics",
  /** 歌曲详情 */
  DETAIL: "/api/song/detail",
  /** 播放上报 */
  PLAY_REPORT: "/api/song/play-report",
} as const;

/** 搜索相关端点 */
export const SEARCH_ENDPOINTS = {
  /** 搜索 */
  SEARCH: "/api/search",
  /** 搜索联想 */
  SUGGEST: "/api/search/suggest",
  /** 热门搜索 */
  HOT: "/api/search/hot",
} as const;

/** 乐库相关端点 */
export const LIBRARY_ENDPOINTS = {
  /** 分类歌曲 */
  CATEGORY: "/api/library/category",
  /** 排行榜 */
  RANKING: "/api/library/ranking",
} as const;

/** 歌单相关端点 */
export const PLAYLIST_ENDPOINTS = {
  /** 创建歌单 */
  CREATE: "/api/playlist/create",
  /** 歌单详情 / 删除 / 更新 */
  DETAIL: (id: string) => `/api/playlist/${id}`,
  /** 歌单歌曲管理 */
  SONGS: (id: string) => `/api/playlist/${id}/songs`,
  /** 歌单排序 */
  SORT: (id: string) => `/api/playlist/${id}/sort`,
  /** 收藏歌单 */
  COLLECT: (id: string) => `/api/playlist/${id}/collect`,
} as const;

/** 用户相关端点 */
export const USER_ENDPOINTS = {
  /** 用户歌单列表 */
  PLAYLISTS: "/api/user/playlists",
  /** 收藏列表 */
  FAVORITES: "/api/user/favorites",
  /** 收藏/取消收藏单首歌曲 */
  FAVORITE_SONG: (songId: number) => `/api/user/favorites/${songId}`,
  /** 播放历史 */
  HISTORY: "/api/user/history",
  /** 下载记录 */
  DOWNLOADS: "/api/user/downloads",
  /** 个人资料 */
  PROFILE: "/api/user/profile",
  /** 修改密码 */
  PASSWORD: "/api/user/password",
  /** 用户设置 */
  SETTINGS: "/api/user/settings",
} as const;

/** 推荐相关端点 */
export const RECOMMEND_ENDPOINTS = {
  /** 每日推荐 */
  DAILY: "/api/recommend/daily",
  /** 私人 FM */
  FM: "/api/recommend/fm",
  /** 猜你喜欢 */
  GUESS: "/api/recommend/guess",
} as const;

/** 会员相关端点 */
export const MEMBER_ENDPOINTS = {
  /** 会员信息 */
  INFO: "/api/member/info",
  /** 开通会员 */
  SUBSCRIBE: "/api/member/subscribe",
  /** 支付回调 */
  PAY_CALLBACK: "/api/member/pay/callback",
  /** 权益校验 */
  CHECK: "/api/member/check",
} as const;

/** 反馈相关端点 */
export const FEEDBACK_ENDPOINTS = {
  /** 提交反馈 */
  SUBMIT: "/api/feedback",
} as const;

/** 所有端点聚合 */
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  SONG: SONG_ENDPOINTS,
  SEARCH: SEARCH_ENDPOINTS,
  LIBRARY: LIBRARY_ENDPOINTS,
  PLAYLIST: PLAYLIST_ENDPOINTS,
  USER: USER_ENDPOINTS,
  RECOMMEND: RECOMMEND_ENDPOINTS,
  MEMBER: MEMBER_ENDPOINTS,
  FEEDBACK: FEEDBACK_ENDPOINTS,
} as const;

// ============================================================
// 11. 当前模式标志 — mock / remote
// ============================================================

/** API 模式类型 */
export type ApiMode = "mock" | "remote";

/** 当前 API 模式，默认 mock（当前行为）；设置 VITE_API_MODE=remote 启用后端 API */
let currentApiMode: ApiMode = (import.meta.env.VITE_API_MODE as ApiMode) || "mock";

/** 获取当前 API 模式 */
export function getApiMode(): ApiMode {
  return currentApiMode;
}

/** 设置 API 模式 */
export function setApiMode(mode: ApiMode): void {
  currentApiMode = mode;
}

/** 判断是否使用远程 API */
export function useRemoteApi(): boolean {
  return currentApiMode === "remote";
}

/** API 模式常量 */
export const API_MODE: ApiMode = currentApiMode;
