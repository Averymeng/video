// ---------------------------------------------------------------------------
// OpenAI 协议适配器
// 兼容 OpenAI 官方以及绝大多数 OpenAI 兼容聚合平台（如 UCloud、DeepSeek 等）。
// 通过可配置的 base_url + api_key 指向任意供应商。
// ---------------------------------------------------------------------------

import type {
  GenerateImageInput,
  GenerateTextInput,
  ImageResult,
  ModelInfo,
  ProviderConfig,
  TextResult,
} from "./types";

/** 拼接 URL，自动处理 base_url 尾部斜杠 */
function joinUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

/** 拉取模型列表：GET {base_url}/models */
export async function listModelsOpenAI(config: ProviderConfig): Promise<ModelInfo[]> {
  const res = await fetch(joinUrl(config.baseUrl, "/models"), {
    headers: authHeaders(config.apiKey),
  });
  if (!res.ok) {
    throw new Error(`list models failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: Array<{ id: string; owned_by?: string }> };
  return (json.data ?? []).map((m) => ({ id: m.id, owned_by: m.owned_by }));
}

/** 文本生成：POST {base_url}/chat/completions */
export async function generateTextOpenAI(
  config: ProviderConfig,
  input: GenerateTextInput,
): Promise<TextResult> {
  const messages: Array<{ role: string; content: string }> = [];
  if (input.system) messages.push({ role: "system", content: input.system });
  messages.push({ role: "user", content: input.prompt });

  const res = await fetch(joinUrl(config.baseUrl, "/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(config.apiKey),
    },
    body: JSON.stringify({
      model: input.model,
      messages,
      temperature: input.temperature ?? 0.7,
    }),
  });
  if (!res.ok) {
    throw new Error(`chat completion failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  return { text, usage: json.usage };
}

/** 图像生成：POST {base_url}/images/generations（返回 base64） */
export async function generateImageOpenAI(
  config: ProviderConfig,
  input: GenerateImageInput,
): Promise<ImageResult> {
  const res = await fetch(joinUrl(config.baseUrl, "/images/generations"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(config.apiKey),
    },
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      n: input.n ?? 1,
      size: input.size ?? "1024x1024",
      // 优先拿 base64，便于本地落盘与二次处理
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    throw new Error(`image generation failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const first = json.data?.[0];
  if (first?.b64_json) return { base64: first.b64_json };
  if (first?.url) return { url: first.url };
  throw new Error("image generation returned no data");
}
