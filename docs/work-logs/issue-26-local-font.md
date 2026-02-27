# Issue #26: フォント配信方式をローカル同梱に変更

## 対応日
2026-02-28

## ブランチ
`feature/issue-26-local-font` → `develop` にマージ済み

## 概要
`pnpm build` 時に Google Fonts（Geist）の取得に失敗してビルドエラーが発生する問題を解消。
`next/font/google` から `geist` npmパッケージ（`next/font/local` ベース）に切り替え、ネットワーク依存を排除した。

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `package.json` | `geist@1.7.0` を dependencies に追加 |
| `pnpm-lock.yaml` | ロックファイル更新 |
| `src/app/layout.tsx` | `next/font/google` → `geist/font/sans`, `geist/font/mono` に変更 |

## 実装詳細

### 方針選定
- 案A: `geist` npmパッケージでローカル同梱 ← **採用**
- 案B: Google Fonts フォールバック戦略 ← 不採用（ビルド時依存は消えないため）

Codex（GPT-5.3）と相談し、案Aで合意。

### 修正内容

**Before:**
```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

**After:**
```tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
```

- `geist` パッケージ内部で `--font-geist-sans` / `--font-geist-mono` が同名で定義されているため、`globals.css` の変更は不要
- CSS変数チェーン: `geist/font/sans` → `localFont({ variable: "--font-geist-sans" })` → `globals.css: --font-sans: var(--font-geist-sans)` → Tailwind

## 検証結果
- `pnpm build`: 成功
- `pnpm test`: 全98件パス
- Codexレビュー: 承認済み（指摘事項なし）

## 受け入れ条件の充足
- [x] ネットワーク接続なしで `pnpm build` が成功する
- [x] フォントの見た目が変わらない（同じGeistフォントファイルを使用）
- [x] CI環境でビルドが安定する
