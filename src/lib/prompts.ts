import type { AssetType } from "./types";

// ---------------------------------------------------------------------------
// Prompt 层 —— 各创作环节的提示词模板集中管理
// 对应 JD 中的「提示词撰写」能力：把专业创作流程翻译成可复用的结构化 prompt。
// ---------------------------------------------------------------------------

export interface PromptPair {
  system: string;
  prompt: string;
}

/** 创作向导的题材/情感/主角选项 */
export interface ScriptOptions {
  genre?: string;
  emotion?: string;
  protagonist?: string;
}

/** 剧本生成（一次产出多个候选版本） */
export function buildScriptVersionsPrompt(idea: string, options: ScriptOptions = {}): PromptPair {
  const { genre, emotion, protagonist } = options;
  return {
    system:
      "你是一名资深的短剧/漫剧编剧，擅长创作节奏紧凑、画面感强的竖屏短剧剧本。",
    prompt: [
      "请根据下面的创意，创作 3 个风格走向不同的剧本候选版本。要求：",
      "1. 每个版本包含 title（中文标题）、logline（一句话梗概，抓人眼球）、script（完整剧本）。",
      "2. 剧本使用标准格式：SCENE 序号、场景标题（内景/外景 + 地点 + 时间）、舞台指示、角色对话（角色名大写标注）。",
      "3. 单个体量控制在 1-3 分钟竖屏短剧，8 个场景以内。",
      "4. 三个版本在核心设定、情绪走向或反转点上要有明显差异。",
      "5. 剧本正文用中文书写。",
      genre ? `题材类型：${genre}` : "",
      emotion ? `情感基调：${emotion}` : "",
      protagonist ? `主角设定：${protagonist}` : "",
      "",
      "只返回 JSON，不要任何额外文字。格式：",
      '{"versions":[{"title":"...","logline":"...","script":"..."}]}',
      "",
      `创意：${idea}`,
    ].filter(Boolean).join("\n"),
  };
}

/** 从剧本解析美术资产（人物 / 场景 / 道具） */
export function buildAssetParsePrompt(script: string): PromptPair {
  return {
    system: "你是专业的影视美术设定师，能从剧本中提取完整的美术资产（人物、场景、道具）。",
    prompt: [
      "从以下剧本中提取所有美术资产，分为三类：",
      "1. characters（人物）：name 角色名（中文）、description 外貌与气质（中文，含年龄、身高体型、发型发色、服装、气质，50 字左右）",
      "2. locations（场景）：name 场景名（中文）、description 环境（中文，空间结构、光线氛围、时代背景，50 字左右）",
      "3. props（道具）：name 道具名（中文）、description 外观用途（中文，外观、材质、用途，30 字左右）",
      "",
      "所有名称与描述均用中文输出。",
      "只返回 JSON 对象，不要任何额外文字。格式：",
      '{"characters":[{"name":"...","description":"..."}],"locations":[{"name":"...","description":"..."}],"props":[{"name":"...","description":"..."}]}',
      "",
      `剧本：\n${script}`,
    ].join("\n"),
  };
}

/** 资产生成图像 prompt —— 按类型输出人物立绘 / 场景概念图 / 道具设定图 */
const ASSET_IMAGE_STYLE: Record<AssetType, string> = {
  character: "full-body character design sheet, front view, standing pose, clean lineart",
  location: "environment concept art, establishing shot, wide composition, atmospheric lighting",
  prop: "prop design sheet, isolated on a plain light background, detailed",
};

export function buildAssetImagePrompt(asset: {
  type: AssetType;
  name: string;
  description: string;
}): string {
  return [
    ASSET_IMAGE_STYLE[asset.type],
    `name: ${asset.name}`,
    asset.description,
    "anime style, high quality, consistent art style, no text, no watermark",
  ].join(", ");
}

/** 从剧本拆解分镜描述（要求返回 JSON） */
export function buildShotDescriptionsPrompt(
  script: string,
  characters: string,
): PromptPair {
  return {
    system: "你是一名专业分镜师，擅长把剧本拆解成可执行的分镜脚本。",
    prompt: [
      "将以下剧本拆解为分镜列表。对每个分镜：",
      "1. description：画面描述（用中文，镜头景别、构图、人物动作与神态、环境），50 字左右",
      "",
      "画面描述用中文输出。",
      "只返回 JSON 数组，不要任何额外文字。格式：",
      '[{"description": "..."}]',
      "",
      `剧本：\n${script}`,
      `角色设定：\n${characters}`,
    ].join("\n"),
  };
}

/** 分镜首帧 / 尾帧图像 prompt */
export function buildFramePrompt(
  shotDescription: string,
  characterReference: string,
  isLastFrame: boolean,
): string {
  const moment = isLastFrame
    ? "the ending moment of this shot, the key pose at the end"
    : "the opening moment of this shot, the key pose at the start";
  return [
    shotDescription,
    moment,
    characterReference ? `characters reference: ${characterReference}` : "",
    "anime style, cinematic composition, high quality, consistent character design",
  ]
    .filter(Boolean)
    .join(", ");
}

/** 视频生成 prompt */
export function buildVideoPrompt(shotDescription: string): string {
  return [
    shotDescription,
    "smooth camera movement, subtle motion, cinematic lighting",
  ].join(", ");
}
