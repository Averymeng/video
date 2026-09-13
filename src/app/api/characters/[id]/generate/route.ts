import db from "@/lib/db";
import { error, getUserId, json, readBody } from "@/lib/api";
import { generateImageGateway } from "@/lib/ai/gateway";
import { buildCharacterViewPrompt } from "@/lib/prompts";
import { saveBase64Image, saveImageFromUrl } from "@/lib/storage";
import type { Character } from "@/lib/db";

type ViewKey = "front" | "three_quarter" | "side" | "back";
type ViewField = "front_view" | "three_quarter_view" | "side_view" | "back_view";

const VIEWS: Array<{ view: ViewKey; field: ViewField }> = [
  { view: "front", field: "front_view" },
  { view: "three_quarter", field: "three_quarter_view" },
  { view: "side", field: "side_view" },
  { view: "back", field: "back_view" },
];

// POST /api/characters/[id]/generate —— 生成角色三视图（四个视角立绘）
export async function POST(req: Request, ctx: RouteContext<"/api/characters/[id]/generate">) {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const character = db.prepare("SELECT * FROM characters WHERE id = ?").get(id) as
    | Character
    | undefined;
  if (!character) return error("角色不存在", 404);

  const body = await readBody<{ model?: string }>(req);

  try {
    const updates: Partial<Record<ViewField, string>> = {};
    for (const { view, field } of VIEWS) {
      const prompt = buildCharacterViewPrompt(character.name, character.description, view);
      const img = await generateImageGateway(userId, "image", {
        model: body?.model ?? "",
        prompt,
      });
      const url = img.base64
        ? saveBase64Image(img.base64)
        : img.url
          ? await saveImageFromUrl(img.url)
          : null;
      if (url) updates[field] = url;
    }

    db.prepare(
      "UPDATE characters SET front_view = ?, three_quarter_view = ?, side_view = ?, back_view = ?, status = 'completed' WHERE id = ?",
    ).run(
      updates.front_view ?? character.front_view,
      updates.three_quarter_view ?? character.three_quarter_view,
      updates.side_view ?? character.side_view,
      updates.back_view ?? character.back_view,
      id,
    );

    return json(db.prepare("SELECT * FROM characters WHERE id = ?").get(id));
  } catch (e) {
    return error(e instanceof Error ? e.message : "三视图生成失败", 502);
  }
}
