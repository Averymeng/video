// ---------------------------------------------------------------------------
// Prompt 层 —— 各创作环节的提示词模板集中管理
// 对应 JD 中的「提示词撰写」能力：把专业创作流程翻译成可复用的结构化 prompt。
// ---------------------------------------------------------------------------

export interface PromptPair {
  system: string;
  prompt: string;
}

/** 剧本生成 */
export function buildScriptPrompt(userIdea: string): PromptPair {
  return {
    system:
      "你是一名资深的短剧/漫剧编剧，擅长创作节奏紧凑、画面感强的竖屏短剧剧本。",
    prompt: [
      "请根据下面的创意，创作一个完整的漫剧剧本。要求：",
      "1. 以英文剧本格式输出（类似影视行业标准），包含 SCENE 序号、场景标题（INT./EXT. + 地点 + 时间）、舞台指示（动作/镜头/情绪）。",
      "2. 有清晰的角色对话，角色名用大写标注。",
      "3. 总时长控制在 1-3 分钟竖屏短剧的体量，8 个场景以内。",
      "4. 剧情要有起承转合和明确的情绪钩子。",
      "",
      `创意：${userIdea}`,
    ].join("\n"),
  };
}

/** 从剧本解析角色列表（要求返回 JSON） */
export function buildCharacterParsePrompt(script: string): PromptPair {
  return {
    system: "你是专业的角色设计师，能从剧本中准确提取角色并撰写人物设定。",
    prompt: [
      "从以下剧本中提取所有出场角色。对每个角色：",
      "1. name：角色名（英文）",
      "2. description：外貌与体型描述（英文，含年龄、身高体型、发型发色、服装、气质，50 词左右）",
      "",
      "只返回 JSON 数组，不要任何额外文字。格式：",
      '[{"name": "...", "description": "..."}]',
      "",
      `剧本：\n${script}`,
    ].join("\n"),
  };
}

/** 角色单视角立绘图像 prompt */
export function buildCharacterViewPrompt(
  name: string,
  description: string,
  view: "front" | "three_quarter" | "side" | "back",
): string {
  const viewMap = {
    front: "front view, facing camera, full body",
    three_quarter: "three-quarter view (3/4 angle), full body",
    side: "side profile view, full body",
    back: "back view, full body",
  };
  return [
    `${viewMap[view]}, character design sheet, single character`,
    `character: ${name}, ${description}`,
    "anime style, clean line art, flat colors, plain neutral background, high quality, consistent character design",
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
      "1. description：英文画面描述（镜头景别、构图、人物动作与神态、环境），50 词左右",
      "",
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
