import db from "@/lib/db";
import { error, json } from "@/lib/api";
import { listModels } from "@/lib/ai";
import type { Provider } from "@/lib/db";

// GET /api/providers/[id]/models —— 从供应商拉取模型列表（/model/list 协议）
export async function GET(_req: Request, ctx: RouteContext<"/api/providers/[id]/models">) {
  const { id } = await ctx.params;
  const provider = db.prepare("SELECT * FROM providers WHERE id = ?").get(id) as
    | Provider
    | undefined;
  if (!provider) return error("供应商不存在", 404);

  try {
    const models = await listModels(provider);
    return json(models);
  } catch (e) {
    return error(e instanceof Error ? e.message : "拉取模型列表失败", 502);
  }
}
