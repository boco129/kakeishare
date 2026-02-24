import { PrismaClient } from "@/generated/prisma/client"

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// Prisma v7 型制約回避をここに閉じ込める（将来差し替えしやすくする）
// v7 では PrismaClientOptions に adapter か accelerateUrl が必須だが、
// SQLite ではどちらも不要。config は生成コードに埋め込み済みのため実行時は問題ない。
function createPrismaClient() {
  return new PrismaClient(
    undefined as unknown as ConstructorParameters<typeof PrismaClient>[0]
  )
}

export const db = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db
}
