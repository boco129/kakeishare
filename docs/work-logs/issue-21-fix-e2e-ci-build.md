# Issue #21: CI E2Eビルドエラー修正

## 対応日
2026-02-26

## ブランチ
`feature/issue-21-fix-e2e-ci-build`

## 問題概要
Issue #19（Vitest基盤導入）のdevelopマージ時に、E2E Tests CIワークフローの `pnpm build`（next build）が型エラーで失敗していた。

### エラー内容
```
./vitest.config.ts:8:5
Type error: No overload matches this call.
  Object literal may only specify known properties, and 'environmentMatchGlobs' does not exist in type 'InlineConfig'.
```

### 原因
1. `tsconfig.json` の `include: ["**/*.ts"]` により `vitest.config.ts` が `next build` の TypeScript 型チェック対象に含まれていた
2. `environmentMatchGlobs` は vitest v4 で廃止されたプロパティであり、`InlineConfig` 型に存在しない

## 作成・変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `tsconfig.json` | `exclude` に `vitest.config.ts` を追加 |
| `vitest.config.ts` | `environmentMatchGlobs` を `projects` 構文に移行 |

## 実装詳細

### 1. tsconfig.json の修正
`vitest.config.ts` を TypeScript コンパイル対象から除外し、`next build` の型チェックに含まれないようにした。

### 2. vitest.config.ts の vitest v4 対応
vitest v4 で廃止された `environmentMatchGlobs` を `projects` 構文に置き換え:
- `src/**/*.test.ts` → `node` 環境で実行
- `src/**/*.test.tsx` → `jsdom` 環境で実行
- 各プロジェクトに `vite-tsconfig-paths` プラグインを個別設定（プロジェクト分離時にパスエイリアスが解決されない問題への対応）

### 3. Codex CLI との相談
OpenAI Codex CLI（gpt-5.3-codex）を使用して解決方針を相談。以下の3案を比較検討:
1. **tsconfig.json の exclude に追加** → 採用（シンプルで副作用なし）
2. vitest.config.mts にリネーム → 非推奨（`**/*.mts` が include にあり効果なし）
3. tsconfig.build.json 分離 → オーバーエンジニアリング

## 検証結果
- `pnpm exec tsc --noEmit`: 型エラーなし
- `pnpm test`: 15テスト全パス
- `pnpm build`: ビルド成功
- CI Unit Tests: 成功
- CI E2E Tests: 成功

## 将来の課題
- テストファイルが増えた場合、`tsconfig.vitest.json` を分離してテスト専用の型チェック環境を整備することも検討
