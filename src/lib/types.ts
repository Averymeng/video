// ---------------------------------------------------------------------------
// 业务数据类型 —— 前后端共享，避免前端引入 better-sqlite3 原生模块
// ---------------------------------------------------------------------------

export type ProjectStatus = "draft" | "completed";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  script: string;
  status: ProjectStatus;
  /** 合成后的成片视频（由视频合成任务写入） */
  video_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  description: string;
  front_view: string | null;
  three_quarter_view: string | null;
  side_view: string | null;
  back_view: string | null;
  status: string;
  created_at: number;
}

export interface Shot {
  id: string;
  project_id: string;
  idx: number;
  description: string;
  first_frame: string | null;
  last_frame: string | null;
  video_url: string | null;
  task_id: string | null;
  duration: number;
  aspect_ratio: string;
  status: string;
  created_at: number;
}

export type ProviderProtocol = "openai" | "gemini" | "seedance" | "google";
export type ModelCapability = "text" | "image" | "video";

export interface Provider {
  id: string;
  user_id: string;
  name: string;
  protocol: ProviderProtocol;
  base_url: string;
  api_key: string;
  /** JSON 数组字符串，如 '["text","image"]' */
  capabilities: string;
  created_at: number;
}

/** 解析供应商能力标签为数组 */
export function providerCapabilities(p: Provider): ModelCapability[] {
  try {
    return JSON.parse(p.capabilities) as ModelCapability[];
  } catch {
    return [];
  }
}

export interface Settings {
  id: string;
  user_id: string;
  default_text_model: string | null;
  default_image_model: string | null;
  default_video_model: string | null;
  language: string;
  updated_at: number;
}

/** 异步任务（如视频合成），由 SQLite 任务队列驱动 */
export interface Task {
  id: string;
  project_id: string;
  type: string;
  status: string;
  output_url: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}
