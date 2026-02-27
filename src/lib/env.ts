// 環境変数バリデーション実行
// モジュール評価時に検証し、不備があれば即座に停止する

export { type Env, validateEnv } from "@/lib/env-schema"
import { validateEnv } from "@/lib/env-schema"

export const env = validateEnv()
