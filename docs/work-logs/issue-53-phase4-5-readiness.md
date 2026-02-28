# Issue #53: Phase 4→5 移行準備：改善点・必要項目の洗い出し

## 対応日
2026-02-28

## ブランチ
`feature/issue-53-phase4-5-readiness`（develop から分岐）

## 概要
Phase 4（AI機能）完了に伴い、コード品質の最終整備とドキュメント更新を実施。ESLint警告をゼロ化し、CLAUDE.mdと要件定義書をPhase 4完了状態に更新。Phase 5（LINE通知連携）開始前の前提条件を整理。

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `docs/work-logs/issue-53-phase4-5-readiness.md` | 本ファイル |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `eslint.config.mjs` | `coverage/**` を globalIgnores に追加（カバレッジ出力への不要lint除去） |
| `src/lib/auth/audit-log.test.ts` | 未使用変数 `consoleSpy` を削除（`vi.spyOn` はインラインで呼び出し） |
| `src/lib/auth/rate-limiter.ts` | `peek()` メソッドから未使用パラメータ `blockMs` を削除（インターフェース・実装・呼び出し元すべて） |
| `src/lib/auth/rate-limiter.test.ts` | `peek()` 呼び出しを新シグネチャに合わせて修正 |
| `src/lib/csv/parser.ts` | `parseDate()` から未使用パラメータ `_format` を削除 |
| `CLAUDE.md` | Phase 4 実装済み技術スタック反映、AI ディレクトリ構成を実態に合わせて更新 |
| `docs/家計共有アプリ_要件定義書_v2.md` | ステータスを「Phase 4 完了・Phase 5 準備中」に更新 |

## 実装詳細

### 1. ESLint 警告ゼロ化（4件→0件）

| 警告 | 修正内容 |
|------|---------|
| `coverage/` 内の unused eslint-disable | `globalIgnores` に `"coverage/**"` 追加 |
| `audit-log.test.ts` — `consoleSpy` assigned but never used | 変数宣言削除、`vi.spyOn` をインラインに |
| `rate-limiter.ts` — `blockMs` defined but never used (peek) | インターフェース・実装・呼び出し元から `blockMs` パラメータ削除 |
| `parser.ts` — `_format` defined but never used | `parseDate` の `_format` パラメータ削除 |

### 2. CLAUDE.md 更新
- 技術スタック: 「Phase 4 以降で導入予定」→「Phase 4 実装済み」+「Phase 5 以降で導入予定」に分離
- AI ディレクトリ構成: 4ファイルの簡易記載 → 実装済み全16ファイル + API ルート + UIコンポーネントの完全記載

### 3. 要件定義書 更新
- ステータス: 「Phase 2 完了・Phase 3 開発中」→「Phase 4 完了・Phase 5 準備中」

## Codex レビュー指摘と対応

| 重大度 | 指摘内容 | 対応 |
|--------|---------|------|
| Major | `CLAUDE.md` の AI UIコンポーネント記載が実ファイルと不一致（`src/components/ai/` は存在しない） | 実態に合わせ `src/components/chat/ChatClient.tsx`, `src/components/review/ai-report-card.tsx`, `ai-insights-card.tsx` に修正 |
| Low | `CsvColumnMapping.format` が型定義に残っているが `parseDate` で未使用 | 将来のフォーマット対応時に対応予定。今回は対応範囲外 |

## Phase 4 完了状態サマリ

| 項目 | 状態 |
|------|------|
| ESLint | 0 errors, 0 warnings |
| TypeScript | strict mode, `noEmit` パス |
| ユニットテスト | 29ファイル, 337テスト, 全パス |
| AI層カバレッジ | 約94% |
| E2Eテスト | 8ファイル（認証・CRUD + AI APIモック） |
| AI機能 | 分類・レポート・削減提案・チャット・テスト基盤 |
| セキュリティ | レート制限（認証+AI）、プライバシー3段階、HMAC監査ログ |
| CI | unit.yml + e2e.yml 全グリーン |

## Phase 5 開始前の前提条件

| 項目 | 状態 | 備考 |
|------|------|------|
| LINE Messaging API アカウント作成 | 未着手 | LINE Developers Console でチャネル作成が必要 |
| LINE SDK 選定 | 未着手 | `@line/bot-sdk` or REST API 直接呼び出し |
| Webhook エンドポイント設計 | 未着手 | Next.js API Route で受信 |
| 通知トリガー設計 | 未着手 | 予算超過・月次サマリ・CSV未取込リマインド |
| DB スキーマ拡張 | 未着手 | LINE user_id の紐付け、通知設定テーブル |

## 将来の課題（Phase 5 以降）

- レート制限の DB/Redis 永続化（サーバー再起動耐性）
- AI token 使用量の DB 永続化・集計ダッシュボード
- プロンプト回帰テスト（代表的な入力セットに対するスナップショット）
- LINE 通知連携（Phase 5 メイン）
- PWA 対応（プッシュ通知の代替手段）
