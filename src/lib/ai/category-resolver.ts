// Phase 4: カテゴリ名→ID解決レイヤー
// Claude APIはカテゴリ「名前」を返すため、DBのcategoryIdに変換する

import type { Visibility } from "@/generated/prisma/enums"

/** DBから取得するカテゴリ情報の最小型 */
export type CategoryForResolver = {
  id: string
  name: string
  defaultVisibility: Visibility
}

/** 解決結果 */
export type CategoryResolveResult = {
  categoryId: string | null
  visibility: Visibility | null
  resolvedName: string
}

/** フォールバック先のカテゴリ名 */
const FALLBACK_NAME = "その他"

/** 同義語辞書: Claude が返しがちな別名 → 正式カテゴリ名 */
const ALIASES: Record<string, string> = {
  外食: "食費",
  飲食: "食費",
  カフェ: "食費",
  グルメ: "食費",
  日用: "日用品",
  生活用品: "日用品",
  通信: "通信費",
  携帯: "通信費",
  交際: "交際費",
  飲み会: "交際費",
  娯楽: "個人娯楽",
  趣味: "個人娯楽",
  服: "衣服・美容",
  美容: "衣服・美容",
  ファッション: "衣服・美容",
  病院: "医療",
  薬: "医療",
  電気: "光熱費",
  ガス: "光熱費",
  水道: "光熱費",
  家賃: "住居",
  車: "自動車",
  定額: "サブスク",
  サブスクリプション: "サブスク",
}

/**
 * カテゴリ名を正規化する
 * - NFKC正規化（全角→半角英数、半角カナ→全角カナ等）
 * - 前後空白除去
 * - 全角/半角スペース除去
 * - 区切り文字の揺れ統一（・、･、／ → /）
 */
export function normalizeCategoryName(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .replace(/[　\s]+/g, "")
    .replace(/[・･／]/g, "/")
}

/**
 * AIが返したカテゴリ名をDBのcategoryIdに解決する
 *
 * 解決順序:
 * 1. 正規化した名前で完全一致
 * 2. 同義語辞書で変換後に一致
 * 3. 「その他」にフォールバック
 * 4. 「その他」も無ければ null
 */
/**
 * カテゴリ一覧から正規化マップを構築する
 * 衝突がある場合は警告ログを出力し、最初のカテゴリを優先する
 */
function buildNormalizedMap(
  categories: CategoryForResolver[]
): Map<string, CategoryForResolver> {
  const map = new Map<string, CategoryForResolver>()
  for (const c of categories) {
    const norm = normalizeCategoryName(c.name)
    if (map.has(norm)) {
      const existing = map.get(norm)!
      console.warn(
        `[ai.category-resolver] 正規化後のカテゴリ名が衝突: "${c.name}" と "${existing.name}" → "${norm}". "${existing.name}" を優先します`
      )
      continue
    }
    map.set(norm, c)
  }
  return map
}

export function resolveCategoryId(
  aiName: string,
  categories: CategoryForResolver[]
): CategoryResolveResult {
  const byNorm = buildNormalizedMap(categories)
  const norm = normalizeCategoryName(aiName)

  // 1. 完全一致
  const direct = byNorm.get(norm)
  if (direct) {
    return {
      categoryId: direct.id,
      visibility: direct.defaultVisibility,
      resolvedName: direct.name,
    }
  }

  // 2. 同義語辞書
  const canonical = ALIASES[norm]
  if (canonical) {
    const matched = byNorm.get(normalizeCategoryName(canonical))
    if (matched) {
      return {
        categoryId: matched.id,
        visibility: matched.defaultVisibility,
        resolvedName: matched.name,
      }
    }
  }

  // 3. フォールバック
  const fallback = byNorm.get(normalizeCategoryName(FALLBACK_NAME))
  if (fallback) {
    return {
      categoryId: fallback.id,
      visibility: fallback.defaultVisibility,
      resolvedName: fallback.name,
    }
  }

  // 4. カテゴリ自体が見つからない
  return { categoryId: null, visibility: null, resolvedName: aiName }
}
