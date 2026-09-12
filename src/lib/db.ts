import Database from "better-sqlite3";
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
`);

// ---------------------------------------------------------------------------
// 类型与工具从独立的 types.ts 重新导出（供前后端共享，避免前端引入原生模块）
// ---------------------------------------------------------------------------
export { providerCapabilities } from "./types";
export type {
  Character,
  ModelCapability,
  Project,
  ProjectStatus,
  Provider,
  ProviderProtocol,
  Settings,
  Shot,
} from "./types";

export default db;
