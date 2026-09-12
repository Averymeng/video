import db from "@/lib/db";
import { genId, json, readBody } from "@/lib/api";
import type { Shot } from "@/lib/db";

// GET /api/projects/[id]/shots —— 分镜列表
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/shots">) {
  const { id } = await ctx.params;
  const rows = db
    .prepare("SELECT * FROM shots WHERE project_id = ? ORDER BY idx ASC")
    .all(id) as Shot[];
  return json(rows);
}

// POST /api/projects/[id]/shots —— 手动创建分镜
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/shots">) {
  const { id } = await ctx.params;
  const body = await readBody<{ description?: string; aspect_ratio?: string }>(req);

  const maxRow = db
    .prepare("SELECT COALESCE(MAX(idx), -1) AS m FROM shots WHERE project_id = ?")
    .get(id) as { m: number };
  const idx = maxRow.m + 1;
  const shotId = genId();

  db.prepare(
    "INSERT INTO shots (id, project_id, idx, description, aspect_ratio, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
  ).run(
    shotId,
    id,
    idx,
    body?.description?.trim() ?? "",
    body?.aspect_ratio ?? "9:16",
    Date.now(),
  );

  const created = db.prepare("SELECT * FROM shots WHERE id = ?").get(shotId) as Shot;
  return json(created, 201);
}
