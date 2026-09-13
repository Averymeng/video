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

/** 内置供应商所属的虚拟用户：平台级后台配置，用户无需自行添加 */
const BUILTIN_USER = "builtin";

/**
 * 解析当前用户在指定能力（text/image/video）下应使用的「供应商 + 模型」。
 * 优先使用显式传入的模型，否则回落到用户默认 → 内置默认；
 * 供应商则取用户自己的（第一个声明该能力者），没有则回落到内置供应商。
 */
export function resolveModel(
  userId: string,
  capability: ModelCapability,
  explicitModel?: string,
): ResolvedModel {
  const ownSettings = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId) as
    | Settings
    | undefined;
  const ownProviders = db
    .prepare("SELECT * FROM providers WHERE user_id = ?")
    .all(userId) as Provider[];
  const builtinProviders = db
    .prepare("SELECT * FROM providers WHERE user_id = ?")
    .all(BUILTIN_USER) as Provider[];
  const builtinSettings = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(BUILTIN_USER) as
    | Settings
    | undefined;

  const provider = [...ownProviders, ...builtinProviders].find((p) =>
    providerCapabilities(p).includes(capability),
  );
  if (!provider) {
    throw new Error(`未配置支持「${capability}」能力的模型供应商，请先在设置页添加`);
  }

  const defaultField = DEFAULT_MODEL_FIELD[capability];
  const model =
    explicitModel ??
    (ownSettings ? (ownSettings[defaultField] as string | null) : null) ??
    (builtinSettings ? (builtinSettings[defaultField] as string | null) : null);
  if (!model) {
    throw new Error(`未选择「${capability}」默认模型，请先在设置页配置`);
  }

  return { provider, model };
}
