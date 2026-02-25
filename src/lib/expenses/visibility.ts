// 支出の visibility 自動解決ロジック
//
// 優先順位:
// 1. 明示指定（リクエストで visibility を指定した場合）
// 2. CategoryVisibilitySetting（ユーザー別オーバーライド）
// 3. Category.defaultVisibility
// 4. PUBLIC（カテゴリ未指定時のフォールバック）

import type { Visibility } from "@/generated/prisma/enums"
import { db } from "@/lib/db"

/**
 * 支出登録時の visibility を決定する
 *
 * @param userId - 支出を登録するユーザーID
 * @param categoryId - カテゴリID（null/undefined ならフォールバック）
 * @param explicit - リクエストで明示的に指定された visibility
 */
export async function resolveVisibility(
  userId: string,
  categoryId?: string | null,
  explicit?: Visibility,
): Promise<Visibility> {
  // 1. 明示指定があればそのまま返す
  if (explicit) return explicit

  // 4. カテゴリ未指定なら PUBLIC
  if (!categoryId) return "PUBLIC"

  // 2 & 3. カテゴリ + ユーザー別設定を一括取得
  const category = await db.category.findUnique({
    where: { id: categoryId },
    include: {
      visibilitySettings: {
        where: { userId },
        select: { visibility: true },
      },
    },
  })

  if (!category) return "PUBLIC"

  // 2. ユーザー別オーバーライドがあればそちらを優先
  // 3. なければカテゴリのデフォルト
  return category.visibilitySettings[0]?.visibility ?? category.defaultVisibility
}
