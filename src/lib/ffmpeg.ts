// ---------------------------------------------------------------------------
// FFmpeg 视频合成
// 将多个分镜视频按顺序拼接为一个 9:16 竖屏成片。
// 先统一缩放到 720x1280（保持宽高比 + 居中黑边），再用 concat filter 拼接。
// ---------------------------------------------------------------------------

import { spawn } from "node:child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const FFMPEG_BIN = process.env.FFMPEG_PATH ?? "ffmpeg";
const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

/** 目标成片分辨率（竖屏 9:16） */
const TARGET_W = 720;
const TARGET_H = 1280;

export interface AssembleResult {
  ok: boolean;
  outputUrl?: string;
  error?: string;
}

/** 将相对 URL（/generated/xx.mp4）转换为磁盘绝对路径 */
function toAbsolute(inputUrl: string): string {
  return path.join(process.cwd(), "public", inputUrl.replace(/^\/+/, ""));
}

function buildArgs(inputs: string[], output: string): string[] {
  const args: string[] = [];
  inputs.forEach((f) => args.push("-i", f));

  const filters: string[] = [];
  inputs.forEach((_, i) => {
    filters.push(
      `[${i}:v]scale=${TARGET_W}:${TARGET_H}:force_original_aspect_ratio=decrease,` +
        `pad=${TARGET_W}:${TARGET_H}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`,
    );
  });
  const concatInputs = inputs.map((_, i) => `[v${i}]`).join("");
  filters.push(`${concatInputs}concat=n=${inputs.length}:v=1:a=0[v]`);

  args.push("-filter_complex", filters.join(";"));
  args.push("-map", "[v]");
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart");
  args.push("-y", output);
  return args;
}

/**
 * 启动 FFmpeg 异步合成任务（非阻塞）。
 * 完成后通过 onDone 回调返回结果，由上层更新任务队列状态。
 */
export function assembleVideos(
  inputUrls: string[],
  onDone: (result: AssembleResult) => void,
): void {
  const outputFilename = `${crypto.randomBytes(8).toString("hex")}.mp4`;
  const outputPath = path.join(GENERATED_DIR, outputFilename);
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }

  const inputs = inputUrls.map(toAbsolute);
  for (const f of inputs) {
    if (!fs.existsSync(f)) {
      onDone({ ok: false, error: `视频文件不存在: ${path.basename(f)}` });
      return;
    }
  }

  const args = buildArgs(inputs, outputPath);
  // turbopackIgnore: ffmpeg 二进制与产物路径是运行时才确定的，避免构建期全量 trace
  const proc = spawn(/* turbopackIgnore: true */ FFMPEG_BIN, args);
  let stderr = "";
  proc.stderr.on("data", (d: Buffer) => {
    stderr += d.toString();
  });
  proc.on("error", (err) => onDone({ ok: false, error: err.message }));
  proc.on("close", (code) => {
    if (code === 0) {
      onDone({ ok: true, outputUrl: `/generated/${outputFilename}` });
    } else {
      const tail = stderr.trim().split("\n").slice(-5).join("\n");
      onDone({ ok: false, error: tail || `ffmpeg 退出码 ${code}` });
    }
  });
}
