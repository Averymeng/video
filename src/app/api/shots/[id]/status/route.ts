import db from "@/lib/db";
import { error, getUserId, json } from "@/lib/api";
import { queryVideoTask } from "@/lib/ai";
import { resolveModel } from "@/lib/ai/resolve";
import { saveVideoFromUrl } from "@/lib/storage";
import type { Shot } from "@/lib/db";

// GET /api/shots/[id]/status —— 查询视频生成任务状态（前端轮询此接口）
export async function GET(req: Request, ctx: RouteContext<"/api/shots/[id]/status">) {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const shot = db.prepare("SELECT * FROM shots WHERE id = ?").get(id) as Shot | undefined;
  if (!shot) return error("分镜不存在", 404);
  if (!shot.task_id) return error("该分镜尚未发起视频生成", 409);

  try {
    const { provider } = resolveModel(userId, "video");
    const task = await queryVideoTask(provider, shot.task_id);

    if (task.status === "succeeded" && task.videoUrl) {
      const url = await saveVideoFromUrl(task.videoUrl);
      db.prepare("UPDATE shots SET video_url = ?, status = 'completed' WHERE id = ?").run(
        url,
        id,
      );
      return json({ status: "succeeded", videoUrl: url });
    }
    if (task.status === "failed") {
      db.prepare("UPDATE shots SET status = 'failed' WHERE id = ?").run(id);
      return json({ status: "failed", error: task.error });
    }
    return json({ status: task.status });
  } catch (e) {
    return error(e instanceof Error ? e.message : "查询任务失败", 502);
  }
}
