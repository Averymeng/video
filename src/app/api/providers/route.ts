import db, { providerCapabilities } from "@/lib/db";
import { error, genId, getUserId, json, readBody } from "@/lib/api";
import type { ModelCapability, Provider, ProviderProtocol } from "@/lib/db";

const VALID_PROTOCOLS: ProviderProtocol[] = ["openai", "gemini", "seedance", "google"];
const VALID_CAPABILITIES: ModelCapability[] = ["text", "image", "video"];

// GET /api/providers —— 供应商列表
// 注意：本地个人使用，返回完整记录。生产环境应对 api_key 脱敏并加密存储。
export async function GET(req: Request) {
  const userId = getUserId(req);
  const rows = db
    .prepare("SELECT * FROM providers WHERE user_id = ? ORDER BY created_at ASC")
    .all(userId) as Provider[];
  return json(
    rows.map((r) => ({ ...r, capabilities: providerCapabilities(r) })),
  );
}

// POST /api/providers —— 添加供应商
export async function POST(req: Request) {
  const userId = getUserId(req);
  const body = await readBody<{
    name?: string;
    protocol?: string;
    base_url?: string;
    api_key?: string;
    capabilities?: string[];
  }>(req);

  if (!body?.name?.trim()) return error("供应商名称不能为空");
  if (!body?.protocol || !VALID_PROTOCOLS.includes(body.protocol as ProviderProtocol)) {
    return error("无效的协议类型");
  }
  if (!body?.base_url?.trim()) return error("Base URL 不能为空");
  if (!body?.api_key?.trim()) return error("API Key 不能为空");
  const capabilities = (body.capabilities ?? []).filter((c) =>
    VALID_CAPABILITIES.includes(c as ModelCapability),
  );
  if (capabilities.length === 0) return error("至少选择一种能力");

  const id = genId();
  db.prepare(
    "INSERT INTO providers (id, user_id, name, protocol, base_url, api_key, capabilities, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    userId,
    body.name.trim(),
    body.protocol,
    body.base_url.trim(),
    body.api_key.trim(),
    JSON.stringify(capabilities),
    Date.now(),
  );

  const created = db.prepare("SELECT * FROM providers WHERE id = ?").get(id) as Provider;
  return json({ ...created, capabilities: providerCapabilities(created) }, 201);
}
