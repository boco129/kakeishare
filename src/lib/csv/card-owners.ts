// カード所有者定義 — どのユーザーがどのカードを持っているか
// status API と dashboard widget で共有

import type { CardType } from "./types"

export interface CardOwnerPair {
  userId: string
  cardType: CardType
}

/** カード×所有者の組み合わせ一覧 */
export const CARD_OWNERS: CardOwnerPair[] = [
  { userId: "user_wife", cardType: "epos" },
  { userId: "user_husband", cardType: "mufg_jcb" },
  { userId: "user_husband", cardType: "mufg_visa" },
]
