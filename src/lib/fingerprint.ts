// ---------------------------------------------------------------------------
// 浏览器指纹（用户隔离）
// 用一个「浏览器属性哈希 + 随机后缀」生成稳定 ID，并持久化到 localStorage，
// 使同一浏览器跨会话保持同一身份，不同浏览器天然隔离。请求时通过 x-user-id
// 头发给后端，后端据此按 user_id 隔离数据。
// ---------------------------------------------------------------------------

const STORAGE_KEY = "user_id";

/** 由浏览器特征计算一个不稳定的指纹（同一浏览器多次计算保持一致） */
function attributeHash(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  let h = 0;
  for (let i = 0; i < parts.length; i++) {
    h = (h * 31 + parts.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/**
 * 获取当前浏览器身份标识。
 * 优先读 localStorage 中已持久化的 ID；首次访问则生成并保存，
 * 保证跨会话稳定、跨浏览器隔离。
 */
export function getFingerprint(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    const id = `fp_${attributeHash()}_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage / crypto 不可用时降级为一次性属性哈希（如隐私窗口）
    return `fp_${attributeHash()}`;
  }
}
