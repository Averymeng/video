import db from "@/lib/db";
import { error, genId, getUserId, json, readBody } from "@/lib/api";
import { generateTextGateway } from "@/lib/ai/gateway";
import { buildShotDescriptionsPrompt } from "@/lib/prompts";
import type { Character, Project } from "@/lib/db";

// POST /api/projects/[id]/shots/parse —— AI 将剧本拆解为分镜描述并批量创建
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/projects/[id]/shots/parse">,
) {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | Project
    | undefined;
  if (!project) return error("项目不存在", 404);
  if (!project.script.trim()) return error("请先生成或输入剧本");

  const characters = db
    .prepare("SELECT * FROM characters WHERE project_id = ?")
    .all(id) as Character[];
  const charSummary = characters.map((c) => `${c.name}: ${c.description}`).join("\n");

  const body = await readBody<{ model?: string }>(req);

  try {
    const { system, prompt } = buildShotDescriptionsPrompt(project.script, charSummary);
    const result = await generateTextGateway(userId, "text", {
      model: body?.model ?? "",
      system,
      prompt,
    });

    const parsed = parseJsonArray(result.text);
    const insert = db.prepare(
      "INSERT INTO shots (id, project_id, idx, description, aspect_ratio, status, created_at) VALUES (?, ?, ?, ?, '9:16', 'pending', ?)",
    );
    const created: Array<{ id: string; idx: number; description: string }> = [];
    const now = Date.now();
    parsed.forEach((item, i) => {
      const description = String(item.description ?? "").trim();
      if (!description) return;
      const shotId = genId();
      insert.run(shotId, id, i, description, now);
      created.push({ id: shotId, idx: i, description });
    });
    return json(created, 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "分镜拆解失败", 502);
  }
}

function parseJsonArray(text: string): Array<Record<string, unknown>> {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("模型未返回有效的分镜列表");
  return JSON.parse(cleaned.slice(start, end + 1)) as Array<Record<string, unknown>>;
}
