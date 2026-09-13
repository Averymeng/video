import db from "@/lib/db";
import { error, json } from "@/lib/api";
import type { Task } from "@/lib/db";

// GET /api/tasks/[id] —— 查询异步任务状态（视频合成等）
export async function GET(_req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const { id } = await ctx.params;
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
  if (!task) return error("任务不存在", 404);
  return json({
    status: task.status,
    outputUrl: task.output_url,
    error: task.error,
  });
}
