import db from "@/lib/db";
import { error, json } from "@/lib/api";

// DELETE /api/providers/[id] —— 删除供应商
export async function DELETE(_req: Request, ctx: RouteContext<"/api/providers/[id]">) {
  const { id } = await ctx.params;
  const existing = db.prepare("SELECT id FROM providers WHERE id = ?").get(id);
  if (!existing) return error("供应商不存在", 404);
  db.prepare("DELETE FROM providers WHERE id = ?").run(id);
  return json({ ok: true });
}
