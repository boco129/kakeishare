// CSV取り込みの unconfirmedCount を再計算するヘルパー
// 一括確認・個別PATCH・DELETE の全箇所で整合性を保証する

import type { PrismaClient } from "@/generated/prisma/client"

/** Prisma のトランザクションクライアント型 */
type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

/**
 * 指定した csvImport の unconfirmedCount を再計算して更新する
 *
 * @param tx - Prisma トランザクションクライアント（またはdbインスタンス）
 * @param csvImportId - 対象の CSV取り込みID
 */
export async function recalcUnconfirmedCount(
  tx: TxClient,
  csvImportId: string,
): Promise<void> {
  const count = await tx.expense.count({
    where: {
      csvImportId,
      confirmed: false,
    },
  })

  await tx.csvImport.update({
    where: { id: csvImportId },
    data: { unconfirmedCount: count },
  })
}
