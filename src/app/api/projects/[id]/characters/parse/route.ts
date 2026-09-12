import db from "@/lib/db";
import { error, genId, getUserId, json, readBody } from "@/lib/api";
import { generateText } from "@/lib/ai";
import { resolveModel } from "@/lib/ai/resolve";
import { buildCharacterParsePrompt } from "@/lib/prompts";
import type { Project } from "@/lib/db";

// POST /api/projects/[id]/characters/parse —— AI 从剧本解析角色并批量创建
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/projects/[id]/characters/parse">,
) {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | Project
    | undefined;
  if (!project) return error("项目不存在", 404);
  if (!project.script.trim()) return error("请先生成或输入剧本");

  const body = await readBody<{ model?: string }>(req);

  try {
    const { provider, model } = resolveModel(userId, "text", body?.model);
    const { system, prompt } = buildCharacterParsePrompt(project.script);
    const result = await generateText(provider, { model, system, prompt });

    const parsed = parseJsonArray(result.text);
    const insert = db.prepare(
      "INSERT INTO characters (id, project_id, name, description, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
    );
    const created: Array<{ id: string; name: string; description: string }> = [];
    const now = Date.now();
    for (const item of parsed) {
      const name = String(item.name ?? "").trim();
      const description = String(item.description ?? "").trim();
      if (!name) continue;
      const charId = genId();
      insert.run(charId, id, name, description, now);
      created.push({ id: charId, name, description });
    }
    return json(created, 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "角色解析失败", 502);
  }
}

/** 从模型输出中稳健地提取 JSON 数组 */
function parseJsonArray(text: string): Array<Record<string, unknown>> {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("模型未返回有效的角色列表");
  return JSON.parse(cleaned.slice(start, end + 1)) as Array<Record<string, unknown>>;
}
