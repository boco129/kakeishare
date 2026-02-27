import { PrismaClient } from "@/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { env } from "@/lib/env"

declare global {
  var __prisma: PrismaClient | undefined
}

// Prisma v7: client エンジンでは adapter が必須
function createPrismaClient() {
  // DATABASE_URL: "file:./prisma/dev.db" → SQLite ファイルパスを抽出
  const url = env.DATABASE_URL.replace(/^file:/, "")
  const adapter = new PrismaBetterSqlite3({ url })
  return new PrismaClient({ adapter })
}

export const db = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db
}
