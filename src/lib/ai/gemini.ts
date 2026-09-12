// ---------------------------------------------------------------------------
// Gemini 协议适配器（Google Gemini / Vertex AI 兼容）
// 文本走 generateContent，图像走 Imagen 的 predict，模型列表走 /v1beta/models。
// ---------------------------------------------------------------------------

import type {
  GenerateImageInput,
  GenerateTextInput,
  ImageResult,
  ModelInfo,
  ProviderConfig,
  TextResult,
} from "./types";

function joinUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

/** Gemini 的模型名在 URL 里需带 models/ 前缀 */
function modelPath(model: string): string {
  return model.startsWith("models/") ? model : `models/${model}`;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { "x-goog-api-key": apiKey };
}

/** 拉取模型列表：GET {base_url}/v1beta/models */
export async function listModelsGemini(config: ProviderConfig): Promise<ModelInfo[]> {
  const res = await fetch(joinUrl(config.baseUrl, "/v1beta/models"), {
    headers: authHeaders(config.apiKey),
  });
  if (!res.ok) {
    throw new Error(`list models failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    models?: Array<{ name?: string; displayName?: string }>;
  };
  return (json.models ?? []).map((m) => ({
    id: (m.name ?? "").replace(/^models\//, ""),
    name: m.displayName,
  }));
}

/** 文本生成：POST {base_url}/v1beta/models/{model}:generateContent */
export async function generateTextGemini(
  config: ProviderConfig,
  input: GenerateTextInput,
): Promise<TextResult> {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    generationConfig: { temperature: input.temperature ?? 0.7 },
  };
  if (input.system) {
    body.system_instruction = { parts: [{ text: input.system }] };
  }

  const res = await fetch(
    joinUrl(config.baseUrl, `/v1beta/${modelPath(input.model)}:generateContent`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(config.apiKey) },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`generateContent failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: unknown;
  };
  const text =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { text, usage: json.usageMetadata };
}

/** 图像生成（Imagen）：POST {base_url}/v1beta/models/{model}:predict */
export async function generateImageGemini(
  config: ProviderConfig,
  input: GenerateImageInput,
): Promise<ImageResult> {
  const res = await fetch(
    joinUrl(config.baseUrl, `/v1beta/${modelPath(input.model)}:predict`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(config.apiKey) },
      body: JSON.stringify({
        instances: [{ prompt: input.prompt }],
        parameters: { sampleCount: input.n ?? 1 },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`image predict failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string; uri?: string }>;
  };
  const first = json.predictions?.[0];
  if (first?.bytesBase64Encoded) return { base64: first.bytesBase64Encoded };
  if (first?.uri) return { url: first.uri };
  throw new Error("image generation returned no data");
}
