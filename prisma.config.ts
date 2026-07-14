// 1 行目にこれを追加するのじゃ！
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // もし .env が読み込めなくても、仙人が怒らないようにダミーを入れるぞ
    url: process.env.DATABASE_URL || "postgresql://dummy@localhost:5432/dummy"
  },
});

