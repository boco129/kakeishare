// 分割払い管理 — クライアント側 API 呼び出し関数

type Visibility = "PUBLIC" | "AMOUNT_ONLY" | "CATEGORY_TOTAL"

export type InstallmentItem = {
  id: string
  userId: string
  userName: string | null
  description: string
  totalAmount: number
  monthlyAmount: number
  totalMonths: number
  remainingMonths: number
  remainingAmount: number
  progressRate: number
  startDate: string
  visibility: Visibility
  fee: number
  masked: boolean
  createdAt: string
  updatedAt: string
}

export type InstallmentSummary = {
  totalCount: number
  totalMonthlyAmount: number
  hiddenCount: number
}

export type InstallmentListResponse = {
  items: InstallmentItem[]
  summary: InstallmentSummary
}

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok || !json.ok) {
    throw new Error(json?.error?.message ?? "APIエラーが発生しました")
  }
  return json.data as T
}

/** 分割払い一覧取得 */
export function listInstallments(
  status: "active" | "completed" | "all" = "active",
): Promise<InstallmentListResponse> {
  return api<InstallmentListResponse>(`/api/installments?status=${status}`)
}

/** 分割払い新規作成 */
export function createInstallment(body: {
  description: string
  totalAmount: number
  monthlyAmount: number
  totalMonths: number
  remainingMonths?: number
  startDate: string
  visibility?: Visibility
  fee?: number
}): Promise<InstallmentItem> {
  return api<InstallmentItem>("/api/installments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

/** 分割払い更新 */
export function updateInstallment(
  id: string,
  body: {
    description?: string
    totalAmount?: number
    monthlyAmount?: number
    totalMonths?: number
    remainingMonths?: number
    startDate?: string
    visibility?: Visibility
    fee?: number
  },
): Promise<InstallmentItem> {
  return api<InstallmentItem>(`/api/installments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

/** 分割払い削除 */
export function removeInstallment(id: string): Promise<{ id: string }> {
  return api<{ id: string }>(`/api/installments/${id}`, { method: "DELETE" })
}
