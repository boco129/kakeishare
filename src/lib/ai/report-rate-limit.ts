// 月次レポート生成のインメモリレート制限
// 1ユーザーあたり月5回まで
// check + record を原子的に行い、競合や失敗リクエストによるバイパスを防止

const MONTHLY_LIMIT = 5

type RateLimitEntry = { count: number; resetMonth: string }
const store = new Map<string, RateLimitEntry>()

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/**
 * レート制限チェック + カウント消費を原子的に行う
 * allowed: true の場合、カウントは既にインクリメント済み
 */
export function consumeReportRateLimit(userId: string): {
  allowed: boolean
  remaining: number
} {
  const month = currentMonth()
  const key = `${userId}:${month}`
  const entry = store.get(key)

  if (!entry || entry.resetMonth !== month) {
    store.set(key, { count: 1, resetMonth: month })
    return { allowed: true, remaining: MONTHLY_LIMIT - 1 }
  }

  if (entry.count >= MONTHLY_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: MONTHLY_LIMIT - entry.count }
}

/** テスト用: ストアをリセット */
export function resetReportRateLimitStore(): void {
  store.clear()
}
