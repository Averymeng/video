import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// 数据库连接
// SQLite 文件存放在项目根目录 data/ 下，该目录已加入 .gitignore
// ---------------------------------------------------------------------------
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// 建表（幂等，首次启动自动初始化）
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL DEFAULT 'local',
    name        TEXT NOT NULL,
    script      TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'draft',
    video_url   TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS characters (
    id                 TEXT PRIMARY KEY,
    project_id         TEXT NOT NULL,
    name               TEXT NOT NULL,
    description        TEXT NOT NULL DEFAULT '',
    front_view         TEXT,
    three_quarter_view TEXT,
    side_view          TEXT,
    back_view          TEXT,
    status             TEXT NOT NULL DEFAULT 'pending',
    created_at         INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shots (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL,
    idx          INTEGER NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    first_frame  TEXT,
    last_frame   TEXT,
    video_url    TEXT,
    task_id      TEXT,
    duration     REAL NOT NULL DEFAULT 0,
    aspect_ratio TEXT NOT NULL DEFAULT '9:16',
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS providers (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL DEFAULT 'local',
    name         TEXT NOT NULL,
    protocol     TEXT NOT NULL,
    base_url     TEXT NOT NULL,
    api_key      TEXT NOT NULL,
    capabilities TEXT NOT NULL,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id                   TEXT PRIMARY KEY,
    user_id              TEXT NOT NULL UNIQUE,
    default_text_model   TEXT,
    default_image_model  TEXT,
    default_video_model  TEXT,
    language             TEXT NOT NULL DEFAULT 'zh',
    updated_at           INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'assemble',
    status      TEXT NOT NULL DEFAULT 'pending',
    output_url  TEXT,
    error       TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_logs (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    capability  TEXT NOT NULL,
    provider_id TEXT,
    model       TEXT,
    status      TEXT NOT NULL,
    latency_ms  INTEGER,
    error       TEXT,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assets (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    type        TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

// 内置供应商唯一约束：防止 build 阶段多 worker 并发 seed 时重复插入
db.exec(
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_builtin_unique ON providers(name) WHERE user_id = 'builtin';`,
);

// ---------------------------------------------------------------------------
// 轻量迁移：为已存在的旧表补充后加的列（幂等）
// 新建库走 CREATE TABLE；旧库（如本地 data/app.db）走 ALTER TABLE。
// ---------------------------------------------------------------------------
function ensureColumn(table: string, column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === column)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  } catch (e) {
    // build 阶段多 worker 并发可能已由其他进程加上该列，忽略「重复列」错误
    if (!(e instanceof Error && /duplicate column/i.test(e.message))) throw e;
  }
}
ensureColumn("projects", "video_url", "video_url TEXT");
ensureColumn("projects", "genre", "genre TEXT NOT NULL DEFAULT ''");
ensureColumn("projects", "emotion", "emotion TEXT NOT NULL DEFAULT ''");
ensureColumn("projects", "protagonist", "protagonist TEXT NOT NULL DEFAULT ''");
ensureColumn("projects", "script_title", "script_title TEXT NOT NULL DEFAULT ''");
ensureColumn("projects", "logline", "logline TEXT NOT NULL DEFAULT ''");

// ---------------------------------------------------------------------------
// 内置模型供应商（后台自动接入）
// 从环境变量 DEEPSEEK_API_KEY 读取密钥，seed 一个「builtin」用户级别的
// DeepSeek 文本供应商 + 默认模型。这样用户打开平台即可直接生成，无需在前端配置。
// 密钥只存在于服务器环境变量与本地数据库中（均已被 .gitignore 排除），绝不提交到仓库。
// ---------------------------------------------------------------------------
const BUILTIN_USER = "builtin";

function seedBuiltinProvider() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return;
  const now = Date.now();
  // INSERT OR IGNORE：providers 上的部分唯一索引 / settings 上的 UNIQUE 约束，
  // 保证 build 阶段多 worker 并发 seed 时只会成功插入一条。
  db.prepare(
    "INSERT OR IGNORE INTO providers (id, user_id, name, protocol, base_url, api_key, capabilities, created_at) VALUES (?, ?, 'DeepSeek', 'openai', 'https://api.deepseek.com', ?, '[\"text\"]', ?)",
  ).run(crypto.randomUUID(), BUILTIN_USER, key, now);
  db.prepare(
    "INSERT OR IGNORE INTO settings (id, user_id, default_text_model, default_image_model, default_video_model, language, updated_at) VALUES (?, ?, 'deepseek-v4-pro', NULL, NULL, 'zh', ?)",
  ).run(crypto.randomUUID(), BUILTIN_USER, now);
}

seedBuiltinProvider();

// ---------------------------------------------------------------------------
// 类型与工具从独立的 types.ts 重新导出（供前后端共享，避免前端引入原生模块）
// ---------------------------------------------------------------------------
export { providerCapabilities } from "./types";
export type {
  Asset,
  AssetType,
  Character,
  ModelCapability,
  Project,
  ProjectStatus,
  Provider,
  ProviderProtocol,
  ScriptVersion,
  Settings,
  Shot,
  Task,
} from "./types";

export default db;
