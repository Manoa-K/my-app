import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// PostgreSQL への接続プール（Render など SSL 必須環境向けの設定）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);

// アプリ全体で使い回す Prisma クライアント
export const prisma = new PrismaClient({ adapter });
