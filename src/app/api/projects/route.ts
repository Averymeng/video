import db from "@/lib/db";
import { error, genId, getUserId, json, readBody } from "@/lib/api";
import type { Project } from "@/lib/db";

// GET /api/projects —— 项目列表
export async function GET(req: Request) {
  const userId = getUserId(req);
  const rows = db
    .prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Project[];
  return json(rows);
}

// POST /api/projects —— 创建项目
export async function POST(req: Request) {
  const userId = getUserId(req);
  const body = await readBody<{ name?: string }>(req);
  if (!body?.name?.trim()) return error("项目名称不能为空");

  const id = genId();
  const now = Date.now();
  db.prepare(
    "INSERT INTO projects (id, user_id, name, script, status, created_at, updated_at) VALUES (?, ?, ?, '', 'draft', ?, ?)",
  ).run(id, userId, body.name.trim(), now, now);

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project;
  return json(project, 201);
}
