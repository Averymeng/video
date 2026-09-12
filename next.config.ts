import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模块，需外部化，避免被打包器处理
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
