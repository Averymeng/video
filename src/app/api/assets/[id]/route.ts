import db from "@/lib/db";
import { error, json, readBody } from "@/lib/api";
import type { Asset } from "@/lib/db";

// PATCH /api/assets/[id] —— 更新资产（名称 / 描述）
export async function PATCH(req: Request, ctx: RouteContext<"/api/assets/[id]">) {
  const { id } = await ctx.params;
  const existing = db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as Asset | undefined;
  if (!existing) return error("资产不存在", 404);

  const body = await readBody<{ name?: string; description?: string }>(req);
  const name = body?.name ?? existing.name;
  const description = body?.description ?? existing.description;
  db.prepare("UPDATE assets SET name = ?, description = ? WHERE id = ?").run(name, description, id);
  return json(db.prepare("SELECT * FROM assets WHERE id = ?").get(id));
}

// DELETE /api/assets/[id] —— 删除资产
export async function DELETE(_req: Request, ctx: RouteContext<"/api/assets/[id]">) {
  const { id } = await ctx.params;
  db.prepare("DELETE FROM assets WHERE id = ?").run(id);
  return json({ ok: true });
}
