// ---------------------------------------------------------------------------
// AI Provider 抽象层 —— 统一类型定义
// 屏蔽不同模型供应商的协议差异，上层业务只依赖这里的抽象接口。
// ---------------------------------------------------------------------------

export type ModelCapability = "text" | "image" | "video";

export interface ModelInfo {
  id: string;
  name?: string;
  owned_by?: string;
}

export interface GenerateTextInput {
  model: string;
  system?: string;
  prompt: string;
  temperature?: number;
}

export interface GenerateImageInput {
  model: string;
  prompt: string;
  /** 像素尺寸，如 1024x1024 */
  size?: string;
  /** 生成数量，默认 1 */
  n?: number;
}

export interface GenerateVideoInput {
  model: string;
  prompt: string;
  /** 首帧图片（base64 或 URL），可选 */
  firstFrame?: string;
  /** 尾帧图片（base64 或 URL），可选 */
  lastFrame?: string;
  /** 视频比例，如 9:16 / 16:9 / 1:1 */
  aspectRatio?: string;
  /** 时长（秒） */
  duration?: number;
}

export interface ImageResult {
  /** base64 图片数据（不含 data: 前缀） */
  base64?: string;
  /** 图片 URL */
  url?: string;
}

export interface TextResult {
  text: string;
  /** 原始响应，便于上层透出 token 用量等信息 */
  usage?: unknown;
}

// ---------------------------------------------------------------------------
// 视频生成是异步任务（提交 → 轮询），用统一的任务描述表达
// ---------------------------------------------------------------------------
export type VideoTaskStatus = "pending" | "processing" | "succeeded" | "failed";

export interface VideoTask {
  taskId: string;
  status: VideoTaskStatus;
  videoUrl?: string;
  error?: string;
}

export interface ProviderConfig {
  protocol: string;
  baseUrl: string;
  apiKey: string;
}
