import db from "@/lib/db";
import { error, json, readBody } from "@/lib/api";
import type { NextRequest } from "next/server";
import type { Project } from "@/lib/db";

// GET /api/projects/[id] —— 项目详情
export async function GET(req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
  if (!project) return error("项目不存在", 404);
  return json(project);
}

// PATCH /api/projects/[id] —— 更新项目（名称 / 剧本 / 状态）
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const body = await readBody<{
    name?: string;
    script?: string;
    status?: string;
    genre?: string;
    emotion?: string;
    protagonist?: string;
    script_title?: string;
    logline?: string;
  }>(req);
  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
  if (!existing) return error("项目不存在", 404);

  const name = body?.name ?? existing.name;
  const script = body?.script ?? existing.script;
  const status = body?.status ?? existing.status;
  const genre = body?.genre ?? existing.genre;
  const emotion = body?.emotion ?? existing.emotion;
  const protagonist = body?.protagonist ?? existing.protagonist;
  const script_title = body?.script_title ?? existing.script_title;
  const logline = body?.logline ?? existing.logline;

  db.prepare(
    "UPDATE projects SET name = ?, script = ?, status = ?, genre = ?, emotion = ?, protagonist = ?, script_title = ?, logline = ?, updated_at = ? WHERE id = ?",
  ).run(name, script, status, genre, emotion, protagonist, script_title, logline, Date.now(), id);
  const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project;
  return json(updated);
}

// DELETE /api/projects/[id] —— 删除项目（级联删除角色、分镜）
export async function DELETE(req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const existing = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
  if (!existing) return error("项目不存在", 404);

  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return json({ ok: true });
}
