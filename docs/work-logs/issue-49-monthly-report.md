# Issue #49: 月次レポート自動生成（プライバシー考慮）

## 対応日

2026-02-28

## ブランチ

`feature/issue-49-monthly-report`（develop から分岐）

## 作成ファイル

| ファイル | 概要 |
|---------|------|
| `src/lib/ai/report-rate-limit.ts` | インメモリレート制限（月5回/ユーザー） |
| `src/lib/ai/report-rate-limit.test.ts` | レート制限ユニットテスト（5件） |
| `src/lib/ai/generate-report.ts` | レポート生成関数 + DashboardSummary→AIReportInput変換 |
| `src/lib/ai/generate-report.test.ts` | レポート生成ユニットテスト（6件、プライバシー検証含む） |
| `src/app/api/ai/report/route.ts` | POST /api/ai/report エンドポイント |
| `src/components/review/ai-report-card.tsx` | AIレポートカード（Client Component） |
| `docs/work-logs/issue-49-monthly-report.md` | 本ファイル |

## 変更ファイル

| ファイル | 変更内容 |
|---------|----------|
| `src/components/review/ReviewDataSection.tsx` | `aiAvailable`・`yearMonth` をクライアントに渡す |
| `src/components/review/ReviewClient.tsx` | プレースホルダーを `<AIReportCard>` に置換 |

## 実装詳細

### レート制限（report-rate-limit.ts）
- `consumeReportRateLimit(userId)` で check + consume を原子的に実行
- インメモリMap管理、月替わりで自動リセット
- 初回Codexレビューで check/record 分離の競合リスクを指摘され、原子的操作に統合

### レポート生成（generate-report.ts）
- `toAIReportInput()`: DashboardSummary からカテゴリ別合計値のみを抽出（明細・店舗名・メモは含めない）
- `generateMonthlyReport()`: Claude Sonnet（AI_MODELS.REPORT）でレポート生成、10文字未満はエラー
- token使用量を `logTokenUsage` で記録

### APIルート（route.ts）
- 認証 → AI可否チェック → レート制限 → 集計取得 → AI生成 → レスポンス
- AI障害時は try-catch で 503 エラー（ユーザーフレンドリーなメッセージ）

### UIコンポーネント（ai-report-card.tsx）
- 3状態: AI未設定 / 未生成（生成ボタン） / 生成済み（レポート表示）
- 免責表示:「AI生成 — 参考情報としてご利用ください」
- 残り回数表示 + 再生成ボタン

## レビュー指摘と対応

### Codex 1回目レビュー（6件）
| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| 1 | High | check/record分離で競合・失敗時バイパス | `consumeReportRateLimit` に統合（修正） |
| 2 | Medium | インメモリ制限は本番で実効性低い | Issue仕様通り。将来DB永続化を検討（スキップ） |
| 3 | Medium | AI障害時のエラーハンドリングがUX的に弱い | try-catchで503+ユーザーフレンドリーメッセージ（修正） |
| 4 | Low | APIレスポンスの型安全性 | 既存パターンと統一（スキップ） |
| 5 | Low | プライバシー検証テスト不足 | summary内部キー固定アサート追加（修正） |
| 6 | Low | テストの型逃がし | 既存パターンと統一（スキップ） |

### Codex 2回目レビュー（1件）
| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| 1 | Low | トップレベルキー固定アサート不足 | `Object.keys(input).sort()` 検証追加（修正） |

### Codex 3回目レビュー
- **承認**。全修正が適切に反映されていることを確認。

## テスト結果

- 全301テスト通過（25ファイル）
- TypeCheck パス
- Lint パス（0エラー、4件は既存warning）

## 将来の課題

- レート制限のDB永続化（サーバー再起動・マルチインスタンス対応）
- レポートのDB保存（再生成不要化）
- レポート生成履歴の管理
