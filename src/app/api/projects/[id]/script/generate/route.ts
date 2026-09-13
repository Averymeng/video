import db from "@/lib/db";
import { error, getUserId, json, readBody } from "@/lib/api";
import { generateTextGateway } from "@/lib/ai/gateway";
import { buildScriptPrompt } from "@/lib/prompts";
import type { Project } from "@/lib/db";

// POST /api/projects/[id]/script/generate —— AI 生成剧本
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/projects/[id]/script/generate">,
) {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | Project
    | undefined;
  if (!project) return error("项目不存在", 404);

  const body = await readBody<{ idea?: string; model?: string }>(req);
  const idea = body?.idea?.trim();
  if (!idea) return error("请先输入故事创意");

  try {
    const { system, prompt } = buildScriptPrompt(idea);
    const result = await generateTextGateway(userId, "text", {
      model: body?.model ?? "",
      system,
      prompt,
    });
    return json({ script: result.text });
  } catch (e) {
    return error(e instanceof Error ? e.message : "剧本生成失败", 502);
  }
}
