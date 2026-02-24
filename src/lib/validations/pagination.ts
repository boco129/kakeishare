// ページネーション共通パラメータ

import { z } from "zod"

/** ページネーション用クエリパラメータスキーマ */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationParams = z.infer<typeof paginationSchema>

/** ページネーションメタ情報 */
export type PaginationMeta = {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

/** ページネーションメタ情報を算出する */
export function calcPaginationMeta(
  page: number,
  limit: number,
  totalCount: number,
): PaginationMeta {
  return {
    page,
    limit,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
  }
}
