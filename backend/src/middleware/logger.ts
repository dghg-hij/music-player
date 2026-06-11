// ============================================================
// 13.4 监控与日志中间件
// 对应文档 13.4 监控与日志规范
// 日志类型：用户行为日志、接口访问日志、错误日志、播放上报日志
// ============================================================

/** 日志级别 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** 日志类型（对应文档 13.4） */
export type LogType = "user_behavior" | "api_access" | "error" | "play_report";

/** 日志记录结构 */
export interface LogEntry {
  type: LogType;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  requestId?: string;
  uid?: string;
  ip?: string;
  path?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
}

/** 日志保留周期（秒） */
export const LOG_RETENTION = {
  user_behavior: 90 * 24 * 3600,   // 90 天
  api_access: 30 * 24 * 3600,      // 30 天
  error: 90 * 24 * 3600,           // 90 天
  play_report: 180 * 24 * 3600,    // 180 天
} as const;

/**
 * 日志写入器接口
 * 可替换为不同实现（D1、Console、外部服务等）
 */
export interface LogWriter {
  write(entry: LogEntry): void | Promise<void>;
}

/**
 * 控制台日志写入器（开发环境）
 */
export class ConsoleLogWriter implements LogWriter {
  write(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}] [${entry.type}]`;
    const base = `${prefix} ${entry.message}`;
    const meta = {
      timestamp: new Date(entry.timestamp).toISOString(),
      requestId: entry.requestId,
      uid: entry.uid,
      ip: entry.ip,
      path: entry.path,
      method: entry.method,
      duration: entry.duration,
      statusCode: entry.statusCode,
      ...entry.data,
    };

    switch (entry.level) {
      case "error":
        console.error(base, meta);
        break;
      case "warn":
        console.warn(base, meta);
        break;
      case "debug":
        console.debug(base, meta);
        break;
      default:
        console.log(base, meta);
    }
  }
}

/**
 * D1 数据库日志写入器（生产环境）
 */
export class D1LogWriter implements LogWriter {
  constructor(private db: D1Database) {}

  async write(entry: LogEntry): Promise<void> {
    try {
      const now = Math.floor(entry.timestamp / 1000);
      const dataJson = entry.data ? JSON.stringify(entry.data) : null;

      switch (entry.type) {
        case "api_access":
          await this.db.prepare(
            `INSERT INTO t_log_api (request_id, uid, ip, method, path, status_code, duration, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              entry.requestId ?? "",
              entry.uid ?? "",
              entry.ip ?? "",
              entry.method ?? "",
              entry.path ?? "",
              entry.statusCode ?? 0,
              entry.duration ?? 0,
              now
            )
            .run();
          break;

        case "error":
          await this.db.prepare(
            `INSERT INTO t_log_error (request_id, uid, level, message, stack, path, method, data, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              entry.requestId ?? "",
              entry.uid ?? "",
              entry.level,
              entry.message,
              entry.data?.stack as string ?? "",
              entry.path ?? "",
              entry.method ?? "",
              dataJson,
              now
            )
            .run();
          break;

        case "user_behavior":
          await this.db.prepare(
            `INSERT INTO t_log_behavior (uid, action, target_type, target_id, data, ip, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              entry.uid ?? "",
              entry.data?.action as string ?? "",
              entry.data?.targetType as string ?? "",
              entry.data?.targetId as string ?? "",
              dataJson,
              entry.ip ?? "",
              now
            )
            .run();
          break;

        case "play_report":
          await this.db.prepare(
            `INSERT INTO t_log_play (uid, song_id, play_time, progress, device, quality, ip, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              entry.uid ?? "",
              entry.data?.songId as number ?? 0,
              entry.data?.playTime as number ?? 0,
              entry.data?.progress as number ?? 0,
              entry.data?.device as string ?? "",
              entry.data?.quality as string ?? "",
              entry.ip ?? "",
              now
            )
            .run();
          break;
      }
    } catch (err) {
      // 日志写入失败不应影响业务，降级到控制台
      console.error("[Logger] D1 write failed:", err, entry);
    }
  }
}

/**
 * 组合日志写入器（同时写入多个目标）
 */
export class CompositeLogWriter implements LogWriter {
  private writers: LogWriter[];

  constructor(...writers: LogWriter[]) {
    this.writers = writers;
  }

  async write(entry: LogEntry): Promise<void> {
    await Promise.allSettled(
      this.writers.map((w) => w.write(entry))
    );
  }
}

// ============================================================
// Logger 工具类
// ============================================================

let globalWriters: LogWriter[] = [new ConsoleLogWriter()];

/** 设置全局日志写入器 */
export function setLogWriters(writers: LogWriter[]): void {
  globalWriters = writers;
}

/** 获取当前日志写入器 */
export function getLogWriters(): LogWriter[] {
  return globalWriters;
}

/** 生成请求 ID */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 从请求中提取客户端 IP */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Real-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * 写入日志
 */
async function writeLog(entry: LogEntry): Promise<void> {
  await Promise.allSettled(
    globalWriters.map((w) => w.write(entry))
  );
}

/** 记录接口访问日志 */
export async function logApiAccess(params: {
  requestId: string;
  uid?: string;
  ip: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
}): Promise<void> {
  await writeLog({
    type: "api_access",
    level: params.statusCode >= 500 ? "error" : params.statusCode >= 400 ? "warn" : "info",
    message: `${params.method} ${params.path} ${params.statusCode}`,
    timestamp: Date.now(),
    ...params,
  });
}

/** 记录错误日志 */
export async function logError(params: {
  requestId: string;
  uid?: string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  await writeLog({
    type: "error",
    level: "error",
    message: params.message,
    timestamp: Date.now(),
    requestId: params.requestId,
    uid: params.uid,
    path: params.path,
    method: params.method,
    data: { stack: params.stack, ...params.data },
  });
}

/** 记录用户行为日志 */
export async function logUserBehavior(params: {
  uid: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  await writeLog({
    type: "user_behavior",
    level: "info",
    message: `用户行为: ${params.action}`,
    timestamp: Date.now(),
    uid: params.uid,
    ip: params.ip,
    data: {
      action: params.action,
      targetType: params.targetType ?? "",
      targetId: params.targetId ?? "",
      ...params.data,
    },
  });
}

/** 记录播放上报日志 */
export async function logPlayReport(params: {
  uid: string;
  songId: number;
  playTime?: number;
  progress?: number;
  device?: string;
  quality?: string;
  ip?: string;
}): Promise<void> {
  await writeLog({
    type: "play_report",
    level: "info",
    message: `播放上报: songId=${params.songId}`,
    timestamp: Date.now(),
    uid: params.uid,
    ip: params.ip,
    data: {
      songId: params.songId,
      playTime: params.playTime ?? 0,
      progress: params.progress ?? 0,
      device: params.device ?? "",
      quality: params.quality ?? "",
    },
  });
}
