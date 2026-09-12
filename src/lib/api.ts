import crypto from "crypto";
import { NextResponse } from "next/server";

/** 生成唯一 ID */
export function genId(): string {
  return crypto.randomUUID();
}

/** 统一成功响应 */
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** 统一错误响应 */
export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * 获取当前用户标识。
 * 里程碑 8 会用浏览器指纹替换这里的实现，目前统一返回 local。
 */
export function getUserId(req: Request): string {
  return req.headers.get("x-user-id") ?? "local";
}

/** 从 body 解析 JSON，失败时返回 null */
export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
