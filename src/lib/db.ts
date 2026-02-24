import { PrismaClient } from "@/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

declare global {
  var __prisma: PrismaClient | undefined
}

// Prisma v7: client エンジンでは adapter が必須
function createPrismaClient() {
  // DATABASE_URL: "file:./prisma/dev.db" → SQLite ファイルパスを抽出
  const url = (process.env.DATABASE_URL ?? "file:./prisma/dev.db").replace(
    "file:",
    ""
  )
  const adapter = new PrismaBetterSqlite3({ url })
  return new PrismaClient({ adapter })
}

export const db = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db
}
