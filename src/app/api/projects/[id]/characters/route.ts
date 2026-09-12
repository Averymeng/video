import db from "@/lib/db";
import { error, genId, json, readBody } from "@/lib/api";
import type { Character } from "@/lib/db";

// GET /api/projects/[id]/characters —— 角色列表
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/characters">) {
  const { id } = await ctx.params;
  const rows = db
    .prepare("SELECT * FROM characters WHERE project_id = ? ORDER BY created_at ASC")
    .all(id) as Character[];
  return json(rows);
}

// POST /api/projects/[id]/characters —— 手动创建角色
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/projects/[id]/characters">,
) {
  const { id } = await ctx.params;
  const body = await readBody<{ name?: string; description?: string }>(req);
  if (!body?.name?.trim()) return error("角色名不能为空");

  const charId = genId();
  db.prepare(
    "INSERT INTO characters (id, project_id, name, description, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
  ).run(charId, id, body.name.trim(), body.description?.trim() ?? "", Date.now());

  const created = db.prepare("SELECT * FROM characters WHERE id = ?").get(charId) as Character;
  return json(created, 201);
}
