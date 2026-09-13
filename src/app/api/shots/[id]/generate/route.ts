import db from "@/lib/db";
import { error, getUserId, json, readBody } from "@/lib/api";
import { createVideoTask } from "@/lib/ai";
import { generateImageGateway, logAICall } from "@/lib/ai/gateway";
import { resolveModel } from "@/lib/ai/resolve";
import { buildFramePrompt, buildVideoPrompt } from "@/lib/prompts";
import { readImageAsBase64, saveBase64Image, saveImageFromUrl } from "@/lib/storage";
import type { Asset, Shot } from "@/lib/db";

type GenerateType = "first_frame" | "last_frame" | "video";

// POST /api/shots/[id]/generate —— 生成首帧 / 尾帧 / 视频
export async function POST(req: Request, ctx: RouteContext<"/api/shots/[id]/generate">) {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const shot = db.prepare("SELECT * FROM shots WHERE id = ?").get(id) as Shot | undefined;
  if (!shot) return error("分镜不存在", 404);

  const body = await readBody<{ type?: string; model?: string }>(req);
  const type = body?.type as GenerateType;
  if (!["first_frame", "last_frame", "video"].includes(type)) {
    return error("无效的生成类型");
  }

  // 该分镜所在项目的角色设定（用于角色一致性参考）
  const characters = db
    .prepare("SELECT * FROM assets WHERE project_id = ? AND type = 'character'")
    .all(shot.project_id) as Asset[];
  const charRef = characters.map((c) => `${c.name}: ${c.description}`).join("; ");

  try {
    // 首帧 / 尾帧 —— 同步图像生成
    if (type === "first_frame" || type === "last_frame") {
      const isLast = type === "last_frame";
      const prompt = buildFramePrompt(shot.description, charRef, isLast);
      const img = await generateImageGateway(userId, "image", {
        model: body?.model ?? "",
        prompt,
      });
      const url = img.base64
        ? saveBase64Image(img.base64)
        : img.url
          ? await saveImageFromUrl(img.url)
          : null;
      if (!url) return error("图像生成返回为空", 502);

      const field = isLast ? "last_frame" : "first_frame";
      db.prepare(`UPDATE shots SET ${field} = ? WHERE id = ?`).run(url, id);
      return json(db.prepare("SELECT * FROM shots WHERE id = ?").get(id));
    }

    // 视频 —— 异步任务：创建任务并返回 taskId，前端轮询查询状态
    const { provider, model } = resolveModel(userId, "video", body?.model);
    const firstFrame = shot.first_frame
      ? readImageAsBase64(shot.first_frame)
      : undefined;
    const started = Date.now();
    let task;
    try {
      task = await createVideoTask(provider, model, {
        prompt: buildVideoPrompt(shot.description),
        firstFrame,
        aspectRatio: shot.aspect_ratio,
      });
      logAICall({
        userId,
        capability: "video",
        providerId: provider.id,
        model,
        status: "success",
        latencyMs: Date.now() - started,
      });
    } catch (e) {
      logAICall({
        userId,
        capability: "video",
        providerId: provider.id,
        model,
        status: "error",
        latencyMs: Date.now() - started,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }

    db.prepare("UPDATE shots SET task_id = ?, status = 'processing' WHERE id = ?").run(
      task.taskId,
      id,
    );
    return json({ taskId: task.taskId });
  } catch (e) {
    return error(e instanceof Error ? e.message : "生成失败", 502);
  }
}
