// ---------------------------------------------------------------------------
// 视频生成协议适配器（异步任务模式：提交 → 轮询结果）
// Seedance（字节火山引擎 Ark 风格）与 Veo（Google Vertex AI 风格）
// 二者都采用「创建任务 → 轮询任务状态」的异步模型，这里统一抽象。
// 具体端点以用户实际配置的供应商为准（base_url 可配）。
// ---------------------------------------------------------------------------

import type { GenerateVideoInput, ProviderConfig, VideoTask, VideoTaskStatus } from "./types";

function joinUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

function buildVideoContent(input: GenerateVideoInput): unknown[] {
  const content: unknown[] = [];
  if (input.firstFrame) {
    content.push({ type: "image_url", image_url: { url: input.firstFrame } });
  }
  if (input.lastFrame) {
    content.push({ type: "image_url", image_url: { url: input.lastFrame } });
  }
  content.push({ type: "text", text: input.prompt });
  return content;
}

// ---------------------------------------------------------------------------
// Seedance（字节 Ark）
// ---------------------------------------------------------------------------
export async function createVideoTaskSeedance(
  config: ProviderConfig,
  model: string,
  input: GenerateVideoInput,
): Promise<VideoTask> {
  const res = await fetch(joinUrl(config.baseUrl, "/contents/generations/tasks"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(config.apiKey) },
    body: JSON.stringify({
      model,
      content: buildVideoContent(input),
      ...(input.aspectRatio ? { ratio: input.aspectRatio } : {}),
      ...(input.duration ? { duration: input.duration } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`seedance create task failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { id?: string };
  return { taskId: json.id ?? "", status: "pending" };
}

export async function queryVideoTaskSeedance(
  config: ProviderConfig,
  taskId: string,
): Promise<VideoTask> {
  const res = await fetch(
    joinUrl(config.baseUrl, `/contents/generations/tasks/${taskId}`),
    { headers: authHeaders(config.apiKey) },
  );
  if (!res.ok) {
    throw new Error(`seedance query task failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { status?: string; content?: { video_url?: string } };
  const status = mapStatus(json.status);
  return {
    taskId,
    status,
    videoUrl: json.content?.video_url,
  };
}

// ---------------------------------------------------------------------------
// Veo（Google Vertex AI 风格，predictLongRunning）
// ---------------------------------------------------------------------------
export async function createVideoTaskVeo(
  config: ProviderConfig,
  model: string,
  input: GenerateVideoInput,
): Promise<VideoTask> {
  const res = await fetch(
    joinUrl(config.baseUrl, `/v1beta/models/${model}:predictLongRunning`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(config.apiKey) },
      body: JSON.stringify({
        instances: [
          {
            prompt: input.prompt,
            ...(input.firstFrame ? { image: { bytesBase64Encoded: input.firstFrame } } : {}),
          },
        ],
        parameters: {
          ...(input.aspectRatio ? { aspectRatio: input.aspectRatio } : {}),
          ...(input.duration ? { durationSeconds: input.duration } : {}),
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`veo create task failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { name?: string };
  return { taskId: json.name ?? "", status: "pending" };
}

export async function queryVideoTaskVeo(
  config: ProviderConfig,
  taskId: string,
): Promise<VideoTask> {
  const res = await fetch(joinUrl(config.baseUrl, `/${taskId}`), {
    headers: authHeaders(config.apiKey),
  });
  if (!res.ok) {
    throw new Error(`veo query task failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    done?: boolean;
    error?: { message?: string };
    response?: { generatedSamples?: Array<{ video?: { uri?: string } }> };
  };
  if (json.error) {
    return { taskId, status: "failed", error: json.error.message };
  }
  if (json.done) {
    return {
      taskId,
      status: "succeeded",
      videoUrl: json.response?.generatedSamples?.[0]?.video?.uri,
    };
  }
  return { taskId, status: "processing" };
}

// ---------------------------------------------------------------------------
// 状态映射辅助
// ---------------------------------------------------------------------------
function mapStatus(raw?: string): VideoTaskStatus {
  switch (raw) {
    case "succeeded":
    case "success":
      return "succeeded";
    case "failed":
    case "cancelled":
      return "failed";
    case "queued":
    case "pending":
      return "pending";
    default:
      return "processing";
  }
}
