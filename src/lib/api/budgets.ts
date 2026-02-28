// 予算管理 — クライアント側 API 呼び出し関数

export type BudgetItem = {
  id: string
  yearMonth: string
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  amount: number
  spent: number
}

export type BudgetListResponse = {
  items: BudgetItem[]
  spentByCategory: Record<string, number>
  totalSpent: number
}

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok || !json.ok) {
    throw new Error(json?.error?.message ?? "APIエラーが発生しました")
  }
  return json.data as T
}

/** 予算一覧取得（meta付き） */
export async function listBudgets(yearMonth: string): Promise<BudgetListResponse> {
  const res = await fetch(`/api/budgets?yearMonth=${yearMonth}`)
  const json = await res.json()
  if (!res.ok || !json.ok) {
    throw new Error(json?.error?.message ?? "APIエラーが発生しました")
  }
  return {
    items: json.data as BudgetItem[],
    spentByCategory: (json.meta?.spentByCategory as Record<string, number>) ?? {},
    totalSpent: (json.meta?.totalSpent as number) ?? 0,
  }
}

/** 予算作成/更新（upsert） */
export const upsertBudget = (body: {
  yearMonth: string
  categoryId: string | null
  amount: number
}) =>
  api<BudgetItem>("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

/** 予算金額更新 */
export const patchBudget = (id: string, amount: number) =>
  api<BudgetItem>(`/api/budgets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  })

/** 予算削除 */
export const deleteBudget = (id: string) =>
  api<{ id: string }>(`/api/budgets/${id}`, { method: "DELETE" })

/** 前月予算コピー */
export const copyBudgets = (targetYearMonth: string) =>
  api<{ copied: number; yearMonth: string }>("/api/budgets/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetYearMonth }),
  })
