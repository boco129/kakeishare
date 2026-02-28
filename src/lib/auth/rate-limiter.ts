// レート制限モジュール
// IP / email / email+ip の3スコープで認証試行を制限する
// 開発環境: インメモリMap、本番: Redis/KV等に差し替え可能なStore抽象

/** レート制限チェック結果 */
export interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

/** ストア抽象インターフェース（将来Redis対応用） */
export interface RateLimitStore {
  /** キーに対して1回消費し、制限チェックを行う（原子的操作） */
  checkAndConsume(
    key: string,
    windowMs: number,
    maxAttempts: number,
    blockMs: number,
  ): RateLimitResult

  /** キーの現在のブロック状態を確認する（消費しない） */
  peek(
    key: string,
  ): RateLimitResult

  /** キーのカウンタをクリアする（ログイン成功時） */
  clear(key: string): void
}

// ---------------------------------------------------------------------------
// インメモリ実装
// ---------------------------------------------------------------------------

interface BucketEntry {
  timestamps: number[]
  blockedUntil: number | null
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, BucketEntry>()

  /** テスト用: 現在時刻を差し替え可能にする */
  now: () => number = () => Date.now()

  checkAndConsume(
    key: string,
    windowMs: number,
    maxAttempts: number,
    blockMs: number,
  ): RateLimitResult {
    const now = this.now()
    let entry = this.buckets.get(key)

    if (!entry) {
      entry = { timestamps: [], blockedUntil: null }
      this.buckets.set(key, entry)
    }

    // ブロック中かチェック
    if (entry.blockedUntil !== null && now < entry.blockedUntil) {
      return { allowed: false, retryAfterMs: entry.blockedUntil - now }
    }

    // ブロック期間を過ぎていたらリセット
    if (entry.blockedUntil !== null) {
      entry.blockedUntil = null
      entry.timestamps = []
    }

    // ウィンドウ外のタイムスタンプを除去
    const windowStart = now - windowMs
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

    // 今回の試行を記録
    entry.timestamps.push(now)

    // 閾値超過判定
    if (entry.timestamps.length > maxAttempts) {
      entry.blockedUntil = now + blockMs
      return { allowed: false, retryAfterMs: blockMs }
    }

    return { allowed: true, retryAfterMs: 0 }
  }

  peek(key: string): RateLimitResult {
    const now = this.now()
    const entry = this.buckets.get(key)
    if (!entry) return { allowed: true, retryAfterMs: 0 }

    if (entry.blockedUntil !== null && now < entry.blockedUntil) {
      return { allowed: false, retryAfterMs: entry.blockedUntil - now }
    }

    return { allowed: true, retryAfterMs: 0 }
  }

  clear(key: string): void {
    this.buckets.delete(key)
  }

  /** 全エントリをクリアする（テスト・開発用） */
  resetAll(): void {
    this.buckets.clear()
  }
}

// ---------------------------------------------------------------------------
// レート制限設定
// ---------------------------------------------------------------------------

const MINUTE = 60 * 1000

export const RATE_LIMIT_CONFIG = {
  ip: { windowMs: 15 * MINUTE, maxAttempts: 20, blockMs: 15 * MINUTE },
  email: { windowMs: 15 * MINUTE, maxAttempts: 5, blockMs: 30 * MINUTE },
  emailIp: { windowMs: 15 * MINUTE, maxAttempts: 7, blockMs: 15 * MINUTE },
} as const

// ---------------------------------------------------------------------------
// シングルトンストア & ファサード
// ---------------------------------------------------------------------------

const store: RateLimitStore = new InMemoryRateLimitStore()

export function getStore(): RateLimitStore {
  return store
}

/** キー生成ヘルパー */
function ipKey(ip: string) {
  return `ip:${ip}`
}
function emailKey(email: string) {
  return `email:${email.toLowerCase()}`
}
function emailIpKey(email: string, ip: string) {
  return `email_ip:${email.toLowerCase()}:${ip}`
}

/**
 * 現在のブロック状態を確認する（消費しない、読み取り専用）
 * actions.tsでのUXフィードバック用
 */
export function peekRateLimit(
  ip: string,
  email: string,
): RateLimitResult {
  const s = getStore()

  const ipResult = s.peek(ipKey(ip))
  const emailResult = s.peek(emailKey(email))
  const emailIpResult = s.peek(emailIpKey(email, ip))

  if (!ipResult.allowed || !emailResult.allowed || !emailIpResult.allowed) {
    const maxRetry = Math.max(
      ipResult.retryAfterMs,
      emailResult.retryAfterMs,
      emailIpResult.retryAfterMs,
    )
    return { allowed: false, retryAfterMs: maxRetry }
  }

  return { allowed: true, retryAfterMs: 0 }
}

/**
 * 認証試行のレート制限チェック（原子的に消費も行う）
 * 3スコープすべてを評価し、いずれかが制限超過ならブロック
 */
export function checkRateLimit(
  ip: string,
  email: string,
): RateLimitResult {
  const s = getStore()
  const cfg = RATE_LIMIT_CONFIG

  const ipResult = s.checkAndConsume(
    ipKey(ip),
    cfg.ip.windowMs,
    cfg.ip.maxAttempts,
    cfg.ip.blockMs,
  )
  const emailResult = s.checkAndConsume(
    emailKey(email),
    cfg.email.windowMs,
    cfg.email.maxAttempts,
    cfg.email.blockMs,
  )
  const emailIpResult = s.checkAndConsume(
    emailIpKey(email, ip),
    cfg.emailIp.windowMs,
    cfg.emailIp.maxAttempts,
    cfg.emailIp.blockMs,
  )

  // いずれかが拒否なら最大の retryAfterMs を返す
  if (!ipResult.allowed || !emailResult.allowed || !emailIpResult.allowed) {
    const maxRetry = Math.max(
      ipResult.retryAfterMs,
      emailResult.retryAfterMs,
      emailIpResult.retryAfterMs,
    )
    return { allowed: false, retryAfterMs: maxRetry }
  }

  return { allowed: true, retryAfterMs: 0 }
}

/** ログイン成功時にemail系カウンタをクリア（IPはクリアしない） */
export function clearRateLimit(ip: string, email: string): void {
  const s = getStore()
  s.clear(emailKey(email))
  s.clear(emailIpKey(email, ip))
}

/** 全レート制限状態をリセットする（テスト・開発用） */
export function resetAllRateLimits(): void {
  const s = getStore()
  if (s instanceof InMemoryRateLimitStore) {
    s.resetAll()
  }
}
