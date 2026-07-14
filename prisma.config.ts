import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // 開発時は .env から、本番は環境変数から DATABASE_URL を読み込むぞ
    url: process.env.DATABASE_URL
  },
});

