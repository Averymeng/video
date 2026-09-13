// ---------------------------------------------------------------------------
// 模型网关（模型拦截层）
// 在业务与各供应商适配器之间加一层：
//   1. 模型解析：显式模型 > 设置里的默认模型
//   2. 故障转移：按声明该能力的供应商顺序逐个尝试，失败自动切换下一个
//   3. 调用审计：每次模型调用（成功/失败）都写入 ai_logs，供评估与观测
// 视频生成是「提交→轮询」的异步任务，轮询与创建供应商强绑定，暂不做故障转移，
// 仅记录调用日志。
// ---------------------------------------------------------------------------

import db, { providerCapabilities } from "@/lib/db";
import { genId } from "@/lib/api";
import { generateImage, generateText } from "./index";
import type {
  GenerateImageInput,
  GenerateTextInput,
  ImageResult,
  TextResult,
} from "./types";
import type { ModelCapability, Provider, Settings } from "@/lib/db";

const DEFAULT_MODEL_FIELD: Record<ModelCapability, keyof Settings> = {
  text: "default_text_model",
  image: "default_image_model",
  video: "default_video_model",
};

/** 按声明顺序返回支持某能力的供应商列表 */
export function providersByCapability(userId: string, capability: ModelCapability): Provider[] {
  const all = db
    .prepare("SELECT * FROM providers WHERE user_id = ? ORDER BY created_at ASC")
    .all(userId) as Provider[];
  return all.filter((p) => providerCapabilities(p).includes(capability));
}

/** 解析最终使用的模型名：显式传入 > 设置默认 */
export function resolveModelName(
  userId: string,
  capability: ModelCapability,
  explicit?: string,
): string {
  const settings = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId) as
    | Settings
    | undefined;
  const model =
    explicit?.trim() || (settings ? (settings[DEFAULT_MODEL_FIELD[capability]] as string | null) : null);
  if (!model) {
    throw new Error(`未选择「${capability}」默认模型，请先在设置页配置`);
  }
  return model;
}

/** 记录一次模型调用（成功或失败），供评估体系 / 观测使用 */
export function logAICall(entry: {
  userId: string;
  capability: ModelCapability;
  providerId: string | null;
  model: string | null;
  status: "success" | "error";
  latencyMs: number;
  error?: string;
}): void {
  db.prepare(
    "INSERT INTO ai_logs (id, user_id, capability, provider_id, model, status, latency_ms, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    genId(),
    entry.userId,
    entry.capability,
    entry.providerId,
    entry.model,
    entry.status,
    entry.latencyMs,
    entry.error ?? null,
    Date.now(),
  );
}

/** 文本生成（带故障转移 + 审计） */
export async function generateTextGateway(
  userId: string,
  capability: ModelCapability,
  input: GenerateTextInput,
): Promise<TextResult> {
  const model = resolveModelName(userId, capability, input.model);
  const providers = providersByCapability(userId, capability);
  if (providers.length === 0) {
    throw new Error(`未配置支持「${capability}」能力的模型供应商，请先在设置页添加`);
  }

  let lastError: Error | null = null;
  for (const provider of providers) {
    const started = Date.now();
    try {
      const result = await generateText(provider, { ...input, model });
      logAICall({
        userId,
        capability,
        providerId: provider.id,
        model,
        status: "success",
        latencyMs: Date.now() - started,
      });
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logAICall({
        userId,
        capability,
        providerId: provider.id,
        model,
        status: "error",
        latencyMs: Date.now() - started,
        error: lastError.message,
      });
    }
  }
  throw lastError ?? new Error("文本生成失败");
}

/** 图像生成（带故障转移 + 审计） */
export async function generateImageGateway(
  userId: string,
  capability: ModelCapability,
  input: GenerateImageInput,
): Promise<ImageResult> {
  const model = resolveModelName(userId, capability, input.model);
  const providers = providersByCapability(userId, capability);
  if (providers.length === 0) {
    throw new Error(`未配置支持「${capability}」能力的模型供应商，请先在设置页添加`);
  }

  let lastError: Error | null = null;
  for (const provider of providers) {
    const started = Date.now();
    try {
      const result = await generateImage(provider, { ...input, model });
      logAICall({
        userId,
        capability,
        providerId: provider.id,
        model,
        status: "success",
        latencyMs: Date.now() - started,
      });
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logAICall({
        userId,
        capability,
        providerId: provider.id,
        model,
        status: "error",
        latencyMs: Date.now() - started,
        error: lastError.message,
      });
    }
  }
  throw lastError ?? new Error("图像生成失败");
}
