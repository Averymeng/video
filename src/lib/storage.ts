import crypto from "crypto";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// 生成产物（图片 / 视频）本地落盘
// 统一写入 public/generated/ 目录，返回可被前端直接访问的 URL 路径。
// ---------------------------------------------------------------------------

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

function ensureDir() {
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }
}

/** 剥离 data URL 前缀，返回纯 base64 与推断出的扩展名 */
function stripDataUrl(data: string): { base64: string; ext: string } {
  const match = data.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (match) {
    const mime = match[1];
    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/webm": "webm",
    };
    return { base64: match[2], ext: extMap[mime] ?? "png" };
  }
  return { base64: data, ext: "png" };
}

/**
 * 将 base64 图片写入本地，返回相对 URL（如 /generated/ab12cd.png）
 */
export function saveBase64Image(base64: string): string {
  const { base64: raw, ext } = stripDataUrl(base64);
  const buffer = Buffer.from(raw, "base64");
  const filename = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
  ensureDir();
  fs.writeFileSync(path.join(GENERATED_DIR, filename), buffer);
  return `/generated/${filename}`;
}

/**
 * 将 base64 视频写入本地，返回相对 URL
 */
export function saveBase64Video(base64: string): string {
  const { base64: raw, ext } = stripDataUrl(base64);
  const buffer = Buffer.from(raw, "base64");
  const filename = `${crypto.randomBytes(8).toString("hex")}.${ext || "mp4"}`;
  ensureDir();
  fs.writeFileSync(path.join(GENERATED_DIR, filename), buffer);
  return `/generated/${filename}`;
}

/**
 * 将远程图片 URL 下载并落盘，返回本地相对 URL（避免外链失效）
 */
export async function saveImageFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download image failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = url.match(/\.(png|jpe?g|webp)/i)?.[1] ?? "png";
  const filename = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
  ensureDir();
  fs.writeFileSync(path.join(GENERATED_DIR, filename), buffer);
  return `/generated/${filename}`;
}

/**
 * 读取本地生成图片并转为 base64 data URL（视频生成需要把首帧作为图片输入传给第三方）
 */
export function readImageAsBase64(urlPath: string): string {
  const filePath = path.join(process.cwd(), "public", urlPath);
  if (!fs.existsSync(filePath)) throw new Error(`文件不存在: ${urlPath}`);
  const buffer = fs.readFileSync(filePath);
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const ext = urlPath.split(".").pop()?.toLowerCase() ?? "png";
  const mime = mimeMap[ext] ?? "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * 下载远程视频并落盘，返回本地相对 URL
 */
export async function saveVideoFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download video failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = `${crypto.randomBytes(8).toString("hex")}.mp4`;
  ensureDir();
  fs.writeFileSync(path.join(GENERATED_DIR, filename), buffer);
  return `/generated/${filename}`;
}
