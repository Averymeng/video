import db from "@/lib/db";
import { error, genId, json } from "@/lib/api";
import { assembleVideos } from "@/lib/ffmpeg";
import type { Project, Shot } from "@/lib/db";

export const runtime = "nodejs";

// POST /api/projects/[id]/assemble —— 发起视频合成任务（异步，返回 taskId）
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/assemble">) {
  const { id } = await ctx.params;

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | Project
    | undefined;
  if (!project) return error("项目不存在", 404);

  const shots = db
    .prepare("SELECT * FROM shots WHERE project_id = ? ORDER BY idx ASC")
    .all(id) as Shot[];
  const videos = shots
    .filter((s) => s.video_url)
    .map((s) => s.video_url as string);
  if (videos.length === 0) return error("尚无已生成的分镜视频，请先在分镜页生成视频");

  const taskId = genId();
  const now = Date.now();
  db.prepare(
    "INSERT INTO tasks (id, project_id, type, status, created_at, updated_at) VALUES (?, ?, 'assemble', 'processing', ?, ?)",
  ).run(taskId, id, now, now);

  // 异步执行 FFmpeg 合成，完成后回写任务队列状态（非阻塞，不 await）
  assembleVideos(videos, (result) => {
    if (result.ok && result.outputUrl) {
      db.prepare(
        "UPDATE tasks SET status = 'completed', output_url = ?, updated_at = ? WHERE id = ?",
      ).run(result.outputUrl, Date.now(), taskId);
      db.prepare(
        "UPDATE projects SET status = 'completed', video_url = ?, updated_at = ? WHERE id = ?",
      ).run(result.outputUrl, Date.now(), id);
    } else {
      db.prepare(
        "UPDATE tasks SET status = 'failed', error = ?, updated_at = ? WHERE id = ?",
      ).run(result.error ?? "合成失败", Date.now(), taskId);
    }
  });

  return json({ taskId }, 202);
}
