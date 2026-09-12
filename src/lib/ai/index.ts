// ---------------------------------------------------------------------------
// AI Provider 统一入口
// 上层业务（API 路由）只 import 这里，按「协议」自动分发到对应适配器。
// ---------------------------------------------------------------------------

import type { Provider } from "@/lib/db";
import {
  generateImageGemini,
  generateTextGemini,
  listModelsGemini,
} from "./gemini";
import {
  generateImageOpenAI,
  generateTextOpenAI,
  listModelsOpenAI,
} from "./openai";
import {
  createVideoTaskSeedance,
  createVideoTaskVeo,
  queryVideoTaskSeedance,
  queryVideoTaskVeo,
} from "./video";
import type {
  GenerateImageInput,
  GenerateTextInput,
  GenerateVideoInput,
  ImageResult,
  ModelInfo,
  ProviderConfig,
  TextResult,
  VideoTask,
} from "./types";

export * from "./types";

function toConfig(provider: Provider): ProviderConfig {
  return {
    protocol: provider.protocol,
    baseUrl: provider.base_url,
    apiKey: provider.api_key,
  };
}

/** 拉取供应商下的模型列表 */
export async function listModels(provider: Provider): Promise<ModelInfo[]> {
  const config = toConfig(provider);
  if (provider.protocol === "gemini") return listModelsGemini(config);
  return listModelsOpenAI(config);
}

/** 文本生成（剧本 / 分镜描述 / 角色解析等） */
export async function generateText(
  provider: Provider,
  input: GenerateTextInput,
): Promise<TextResult> {
  const config = toConfig(provider);
  if (provider.protocol === "gemini") return generateTextGemini(config, input);
  return generateTextOpenAI(config, input);
}

/** 图像生成（角色三视图 / 分镜首尾帧等） */
export async function generateImage(
  provider: Provider,
  input: GenerateImageInput,
): Promise<ImageResult> {
  const config = toConfig(provider);
  if (provider.protocol === "gemini") return generateImageGemini(config, input);
  return generateImageOpenAI(config, input);
}

/** 创建视频生成任务 */
export async function createVideoTask(
  provider: Provider,
  model: string,
  input: GenerateVideoInput,
): Promise<VideoTask> {
  const config = toConfig(provider);
  if (provider.protocol === "seedance") {
    return createVideoTaskSeedance(config, model, input);
  }
  if (provider.protocol === "google") {
    return createVideoTaskVeo(config, model, input);
  }
  throw new Error(`unsupported video protocol: ${provider.protocol}`);
}

/** 查询视频生成任务状态 */
export async function queryVideoTask(provider: Provider, taskId: string): Promise<VideoTask> {
  const config = toConfig(provider);
  if (provider.protocol === "seedance") {
    return queryVideoTaskSeedance(config, taskId);
  }
  if (provider.protocol === "google") {
    return queryVideoTaskVeo(config, taskId);
  }
  throw new Error(`unsupported video protocol: ${provider.protocol}`);
}
