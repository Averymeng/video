import db from "@/lib/db";
import { error, genId, json, readBody } from "@/lib/api";
import type { Asset, AssetType } from "@/lib/db";

const ASSET_TYPES: AssetType[] = ["character", "location", "prop"];

// GET /api/projects/[id]/assets —— 资产列表（人物 / 场景 / 道具）
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/assets">) {
  const { id } = await ctx.params;
  const rows = db
    .prepare("SELECT * FROM assets WHERE project_id = ? ORDER BY created_at ASC")
    .all(id) as Asset[];
  return json(rows);
}

// POST /api/projects/[id]/assets —— 手动创建单个资产
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/assets">) {
  const { id } = await ctx.params;
  const body = await readBody<{ type?: string; name?: string; description?: string }>(req);
  const type = body?.type as AssetType;
  if (!ASSET_TYPES.includes(type)) return error("无效的资产类型");
  if (!body?.name?.trim()) return error("资产名不能为空");

  const assetId = genId();
  db.prepare(
    "INSERT INTO assets (id, project_id, type, name, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(assetId, id, type, body.name.trim(), body.description?.trim() ?? "", Date.now());

  const created = db.prepare("SELECT * FROM assets WHERE id = ?").get(assetId) as Asset;
  return json(created, 201);
}
