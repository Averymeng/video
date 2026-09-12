import db from "@/lib/db";
import { genId, getUserId, json, readBody } from "@/lib/api";
import type { Settings } from "@/lib/db";

function getOrCreate(userId: string): Settings {
  let s = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId) as
    | Settings
    | undefined;
  if (!s) {
    s = {
      id: genId(),
      user_id: userId,
      default_text_model: null,
      default_image_model: null,
      default_video_model: null,
      language: "zh",
      updated_at: Date.now(),
    };
    db.prepare(
      "INSERT INTO settings (id, user_id, default_text_model, default_image_model, default_video_model, language, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      s.id,
      s.user_id,
      s.default_text_model,
      s.default_image_model,
      s.default_video_model,
      s.language,
      s.updated_at,
    );
  }
  return s;
}

// GET /api/settings —— 获取设置
export async function GET(req: Request) {
  return json(getOrCreate(getUserId(req)));
}

// PATCH /api/settings —— 更新设置（默认模型 / 语言）
export async function PATCH(req: Request) {
  const userId = getUserId(req);
  const body = await readBody<{
    default_text_model?: string | null;
    default_image_model?: string | null;
    default_video_model?: string | null;
    language?: string;
  }>(req);

  const s = getOrCreate(userId);
  const next = {
    default_text_model: body?.default_text_model !== undefined ? body.default_text_model : s.default_text_model,
    default_image_model: body?.default_image_model !== undefined ? body.default_image_model : s.default_image_model,
    default_video_model: body?.default_video_model !== undefined ? body.default_video_model : s.default_video_model,
    language: body?.language ?? s.language,
  };

  db.prepare(
    "UPDATE settings SET default_text_model = ?, default_image_model = ?, default_video_model = ?, language = ?, updated_at = ? WHERE user_id = ?",
  ).run(
    next.default_text_model,
    next.default_image_model,
    next.default_video_model,
    next.language,
    Date.now(),
    userId,
  );

  return json(getOrCreate(userId));
}
