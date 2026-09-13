import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模块，需外部化，避免被打包器处理
  serverExternalPackages: ["better-sqlite3"],
  // 隐藏左下角的 Next.js 开发指示器（红色小按钮）
  devIndicators: false,
};

export default nextConfig;
