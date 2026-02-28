# Issue #51: チャットアドバイザーUI

## 対応日
2026-02-28

## ブランチ
`feature/issue-51-chat-advisor`（develop から分岐）

## 概要
家計データを踏まえた自由質問ができるチャットUIを実装。
Claude Sonnet にプライバシー制御済みの集計データをコンテキストとして渡し、SSEストリーミングで応答を生成する。

## 作成ファイル
| ファイル | 説明 |
|---------|------|
| `src/lib/ai/chat-rate-limit.ts` | チャット日次レート制限（20回/日） |
| `src/lib/ai/chat-rate-limit.test.ts` | レート制限テスト（5件） |
| `src/lib/ai/build-chat-context.ts` | ダッシュボード集計→テキストコンテキスト変換 |
| `src/lib/ai/build-chat-context.test.ts` | コンテキスト生成テスト（8件） |
| `src/app/api/ai/chat/route.ts` | POST /api/ai/chat SSEストリーミングAPI |
| `src/app/(app)/chat/page.tsx` | チャットページ（Server Component） |
| `src/components/chat/ChatClient.tsx` | チャットUI（Client Component） |
| `docs/work-logs/issue-51-chat-advisor.md` | 本ドキュメント |

## 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `src/components/layout/navigation-items.ts` | 「相談」ナビ追加（MessageCircle） |
| `src/components/layout/bottom-tab-bar.tsx` | grid-cols-4→5 |
| `src/lib/ai/index.ts` | buildChatContext, consumeChatRateLimit エクスポート追加 |
| `src/components/layout/navigation-utils.test.ts` | /chat パステスト追加 |

## 実装詳細

### APIルート（SSEストリーミング）
- `withApiHandler` は使用しない（ストリーミングと非互換）
- 認証・AIチェック・Zodパース・レート制限はストリーム前にJSON返却
- ストリーム中のエラーはSSEイベントで返却
- SSEイベント: `text`（テキストチャンク）, `done`（完了+残り回数）, `error`

### コンテキスト生成
- `getDashboardSummary(months:3)` で直近3ヶ月の集計データ取得
- テキスト形式で要約（トークン節約）
- プライバシー安全: カテゴリ集計値のみ（明細・店舗名・メモは含めない）

### レート制限
- 日次20回/ユーザー（レポート月5回とは別管理）
- インメモリMap、日付文字列でリセット判定

### チャットUI
- 3状態: AI未設定 / 初期（プリセット質問4件）/ 会話中
- ストリーミング表示（タイピングアニメーション）
- Enter送信 / Shift+Enter改行
- 「新しい会話」ボタン + 残り回数表示
- 会話履歴はフロントエンドstate（DB保存なし、最新10件をAPIに送信）

## テスト結果
- 全337テスト通過
- lint + typecheck パス（エラー0、既存warning 4件のみ）
