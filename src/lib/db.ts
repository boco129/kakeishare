import { PrismaClient } from "@/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma v7 では PrismaClientOptions の型定義上 adapter か accelerateUrl が必須だが、
// SQLite ではどちらも不要。config は生成コードに埋め込み済みのため実行時は問題ない。
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(undefined as unknown as ConstructorParameters<typeof PrismaClient>[0])

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
