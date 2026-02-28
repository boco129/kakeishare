// チャットアドバイザーのインメモリレート制限
// 1ユーザーあたり1日20回まで
// check + record を原子的に行い、競合や失敗リクエストによるバイパスを防止

const DAILY_LIMIT = 20

type RateLimitEntry = { count: number; resetDay: string }
const store = new Map<string, RateLimitEntry>()

function currentDay(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/**
 * レート制限チェック + カウント消費を原子的に行う
 * allowed: true の場合、カウントは既にインクリメント済み
 */
export function consumeChatRateLimit(userId: string): {
  allowed: boolean
  remaining: number
} {
  const day = currentDay()
  const key = `${userId}:${day}`
  const entry = store.get(key)

  if (!entry || entry.resetDay !== day) {
    store.set(key, { count: 1, resetDay: day })
    return { allowed: true, remaining: DAILY_LIMIT - 1 }
  }

  if (entry.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: DAILY_LIMIT - entry.count }
}

/** テスト用: ストアをリセット */
export function resetChatRateLimitStore(): void {
  store.clear()
}
