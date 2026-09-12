import db, { providerCapabilities } from "@/lib/db";
import type { ModelCapability, Provider, Settings } from "@/lib/db";

export interface ResolvedModel {
  provider: Provider;
  model: string;
}

const DEFAULT_MODEL_FIELD: Record<ModelCapability, keyof Settings> = {
  text: "default_text_model",
  image: "default_image_model",
  video: "default_video_model",
};

/**
 * 解析当前用户在指定能力（text/image/video）下应使用的「供应商 + 模型」。
 * 优先使用显式传入的模型，否则回落到设置里的默认模型；
 * 供应商则取第一个声明了该能力的供应商。
 */
export function resolveModel(
  userId: string,
  capability: ModelCapability,
  explicitModel?: string,
): ResolvedModel {
  const settings = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId) as
    | Settings
    | undefined;
  const providers = db
    .prepare("SELECT * FROM providers WHERE user_id = ?")
    .all(userId) as Provider[];

  const provider = providers.find((p) => providerCapabilities(p).includes(capability));
  if (!provider) {
    throw new Error(`未配置支持「${capability}」能力的模型供应商，请先在设置页添加`);
  }

  const defaultField = DEFAULT_MODEL_FIELD[capability];
  const model =
    explicitModel ?? (settings ? (settings[defaultField] as string | null) : null);
  if (!model) {
    throw new Error(`未选择「${capability}」默认模型，请先在设置页配置`);
  }

  return { provider, model };
}
