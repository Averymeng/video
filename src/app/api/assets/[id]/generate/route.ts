import db from "@/lib/db";
import { error, getUserId, json, readBody } from "@/lib/api";
import { generateImageGateway } from "@/lib/ai/gateway";
import { buildAssetImagePrompt } from "@/lib/prompts";
import { saveBase64Image, saveImageFromUrl } from "@/lib/storage";
import type { Asset } from "@/lib/db";

// POST /api/assets/[id]/generate —— 生成资产设定图（人物立绘 / 场景概念图 / 道具设定图）
export async function POST(req: Request, ctx: RouteContext<"/api/assets/[id]/generate">) {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as Asset | undefined;
  if (!asset) return error("资产不存在", 404);

  const body = await readBody<{ model?: string }>(req);

  try {
    const img = await generateImageGateway(userId, "image", {
      model: body?.model ?? "",
      prompt: buildAssetImagePrompt(asset),
    });
    const url = img.base64
      ? saveBase64Image(img.base64)
      : img.url
        ? await saveImageFromUrl(img.url)
        : null;
    if (!url) return error("图像生成返回为空", 502);

    db.prepare("UPDATE assets SET image_url = ? WHERE id = ?").run(url, id);
    return json(db.prepare("SELECT * FROM assets WHERE id = ?").get(id));
  } catch (e) {
    return error(e instanceof Error ? e.message : "资产生图失败", 502);
  }
}
