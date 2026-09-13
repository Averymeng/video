import db from "@/lib/db";
import { error, getUserId, json, readBody } from "@/lib/api";
import { generateTextGateway } from "@/lib/ai/gateway";
import { buildScriptVersionsPrompt } from "@/lib/prompts";
import type { Project, ScriptVersion } from "@/lib/db";

// POST /api/projects/[id]/script/generate —— AI 生成多个剧本候选版本
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

  const body = await readBody<{
    idea?: string;
    genre?: string;
    emotion?: string;
    protagonist?: string;
    model?: string;
  }>(req);
  const idea = body?.idea?.trim();
  if (!idea) return error("请先输入故事创意");

  try {
    const { system, prompt } = buildScriptVersionsPrompt(idea, {
      genre: body?.genre,
      emotion: body?.emotion,
      protagonist: body?.protagonist,
    });
    const result = await generateTextGateway(userId, "text", {
      model: body?.model ?? "",
      system,
      prompt,
    });
    return json({ versions: parseVersions(result.text) });
  } catch (e) {
    return error(e instanceof Error ? e.message : "剧本生成失败", 502);
  }
}

/** 从模型输出中稳健地提取候选版本 */
function parseVersions(text: string): ScriptVersion[] {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("模型未返回有效的剧本版本");
  const obj = JSON.parse(cleaned.slice(start, end + 1)) as {
    versions?: Array<{ title?: string; logline?: string; script?: string }>;
  };
  const versions = (obj.versions ?? []).map((v) => ({
    title: String(v.title ?? "").trim(),
    logline: String(v.logline ?? "").trim(),
    script: String(v.script ?? "").trim(),
  }));
  if (versions.length === 0) throw new Error("模型未返回有效的剧本版本");
  return versions;
}
