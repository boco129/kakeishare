# Issue #47: Anthropic SDK 導入 + AIクライアント基盤

## 対応日
2026-02-28

## ブランチ
`feature/issue-47-ai-client-foundation` → `develop` にマージ済み

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `src/lib/ai/client.ts` | Anthropic SDKシングルトンクライアント |
| `src/lib/ai/client.test.ts` | クライアントテスト（8テスト） |
| `src/lib/ai/category-resolver.ts` | カテゴリ名→ID解決レイヤー |
| `src/lib/ai/category-resolver.test.ts` | カテゴリ解決テスト（18テスト） |
| `src/lib/ai/prompts.ts` | プロンプトテンプレート管理 |
| `src/lib/ai/prompts.test.ts` | プロンプトテスト（15テスト） |
| `src/lib/ai/usage-logger.ts` | token使用量ログ出力 |
| `src/lib/ai/usage-logger.test.ts` | ログテスト（4テスト） |

### 変更
| ファイル | 内容 |
|---------|------|
| `package.json` | `@anthropic-ai/sdk` 0.78.0 追加 |
| `pnpm-lock.yaml` | ロックファイル更新 |
| `src/lib/ai/index.ts` | 新規モジュールのエクスポート追加 |

## 実装詳細

### 1. Anthropic SDKクライアント (`client.ts`)
- `getAnthropicClient(env)`: 毎回新規生成（テスト・ワンショット用）
- `getAnthropicClientSingleton(env)`: APIキー単位でキャッシュ（HMR対策）
- `AI_MODELS`: 用途別モデル定数（分類: haiku, レポート: sonnet）
- timeout: 30秒、maxRetries: 2回

### 2. カテゴリ名→ID解決 (`category-resolver.ts`)
- `normalizeCategoryName()`: NFKC正規化、スペース除去、区切り文字統一
- `resolveCategoryId()`: 完全一致 → 同義語辞書 → 「その他」フォールバック
- 同義語辞書: 15パターン（外食→食費、カフェ→食費、etc.）
- 正規化キー衝突検知（console.warn + 先勝ち）

### 3. プロンプトテンプレート (`prompts.ts`)
- `buildCategorySystemPrompt(categoryNames?)`: DBカテゴリ注入対応
- `buildCategoryUserMessage()`: バッチ上限100件チェック
- `buildReportSystemPrompt/UserMessage()`: 月次レポート用
- `buildChatSystemPrompt/UserMessage()`: チャットアドバイザー用
- `PROMPT_VERSIONS`: バージョン管理定数

### 4. token使用量ログ (`usage-logger.ts`)
- `logTokenUsage()`: 構造化ログ出力（将来DB保存可能な構造）
- キャッシュトークン集計対応

## Codexレビュー指摘と対応

| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| 1 | High | カテゴリ固定化 | `buildCategorySystemPrompt`にDB注入引数追加 |
| 2 | Medium | singleton env固定 | APIキー単位Map キャッシュに変更 |
| 3 | Medium | 正規化キー衝突 | `buildNormalizedMap`で衝突検知・警告 |
| 4 | Medium | 入力長制限なし | `MAX_CLASSIFICATION_BATCH_SIZE=100`導入 |
| 5 | Low | テスト不足 | 6テスト追加 |

## テスト結果
- 全270テストパス（新規45テスト + 既存225テスト）
- lint: エラーなし

## 将来の課題
- カテゴリ名のDB `@@unique` 制約追加を検討
- token使用量のDB保存（現在はconsole.infoのみ）
- プロンプトのバージョニングをDB管理に移行する可能性
