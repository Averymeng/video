import db from "@/lib/db";
import { error, genId, getUserId, json, readBody } from "@/lib/api";
import { generateTextGateway } from "@/lib/ai/gateway";
import { buildAssetParsePrompt } from "@/lib/prompts";
import type { Asset, AssetType, Project } from "@/lib/db";

// POST /api/projects/[id]/assets/parse —— AI 从剧本解析美术资产（人物/场景/道具）并批量创建
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/projects/[id]/assets/parse">,
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
    const { system, prompt } = buildAssetParsePrompt(project.script);
    const result = await generateTextGateway(userId, "text", {
      model: body?.model ?? "",
      system,
      prompt,
    });
    const parsed = parseAssets(result.text);

    const insert = db.prepare(
      "INSERT INTO assets (id, project_id, type, name, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const created: Asset[] = [];
    const now = Date.now();
    const groups: Array<{ type: AssetType; list: Array<{ name: string; description: string }> }> = [
      { type: "character", list: parsed.characters },
      { type: "location", list: parsed.locations },
      { type: "prop", list: parsed.props },
    ];
    for (const g of groups) {
      for (const item of g.list) {
        const name = String(item.name ?? "").trim();
        const description = String(item.description ?? "").trim();
        if (!name) continue;
        const assetId = genId();
        insert.run(assetId, id, g.type, name, description, now);
        created.push({
          id: assetId,
          project_id: id,
          type: g.type,
          name,
          description,
          image_url: null,
          created_at: now,
        });
      }
    }
    return json(created, 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "资产解析失败", 502);
  }
}

/** 从模型输出中稳健地提取三类资产 */
function parseAssets(text: string): {
  characters: Array<{ name: string; description: string }>;
  locations: Array<{ name: string; description: string }>;
  props: Array<{ name: string; description: string }>;
} {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("模型未返回有效的资产");
  const obj = JSON.parse(cleaned.slice(start, end + 1)) as {
    characters?: Array<{ name?: string; description?: string }>;
    locations?: Array<{ name?: string; description?: string }>;
    props?: Array<{ name?: string; description?: string }>;
  };
  const norm = (arr?: Array<{ name?: string; description?: string }>) =>
    (arr ?? []).map((x) => ({
      name: String(x.name ?? ""),
      description: String(x.description ?? ""),
    }));
  return {
    characters: norm(obj.characters),
    locations: norm(obj.locations),
    props: norm(obj.props),
  };
}
