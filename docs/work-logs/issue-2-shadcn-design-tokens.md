# Issue #2: shadcn/ui 初期化とデザイントークン定義

## 基本情報

| 項目 | 内容 |
|------|------|
| Issue | [#2](https://github.com/boco129/kakeishare/issues/2) |
| 対応日 | 2026-02-24 |
| ブランチ | `feature/issue-2-shadcn-design-tokens` |
| マージ先 | `develop` |
| コミット | `347be8d` |

## 作成・変更ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `components.json` | 新規 | shadcn/ui設定ファイル（style: new-york, baseColor: slate, CSS variables有効） |
| `src/lib/utils.ts` | 新規 | `cn()` ユーティリティ関数（clsx + tailwind-merge） |
| `src/components/ui/button.tsx` | 新規 | Buttonコンポーネント |
| `src/components/ui/card.tsx` | 新規 | Cardコンポーネント |
| `src/components/ui/input.tsx` | 新規 | Inputコンポーネント |
| `src/components/ui/label.tsx` | 新規 | Labelコンポーネント |
| `src/components/ui/select.tsx` | 新規 | Selectコンポーネント |
| `src/components/ui/badge.tsx` | 新規 | Badgeコンポーネント |
| `src/components/ui/dialog.tsx` | 新規 | Dialogコンポーネント |
| `src/components/ui/dropdown-menu.tsx` | 新規 | DropdownMenuコンポーネント |
| `src/app/globals.css` | 変更 | shadcn/uiテーマ変数＋カケイシェアカラーシステム定義 |
| `package.json` | 変更 | shadcn/ui関連の依存追加 |
| `pnpm-lock.yaml` | 変更 | ロックファイル更新 |

## 実装詳細

### shadcn/ui 初期化

`pnpm dlx shadcn@latest init` で初期化。以下の設定を採用：

- **Style**: `new-york`（`default`は非推奨寄りのため）
- **Base Color**: `slate`（カケイシェアの背景・テキストカラーに合致）
- **CSS Variables**: 有効（テーマ運用の柔軟性確保）
- **RSC**: 有効（Next.js App Router対応）
- **Icon Library**: `lucide`

### カラーシステム設定（画面設計書セクション5準拠）

CSS変数はOKLCH形式で定義（shadcn最新トークンとの整合性のため）。

| 用途 | HEX目標値 | OKLCH値 | CSS変数名 |
|------|-----------|---------|-----------|
| メインカラー（Indigo） | #4F46E5 | `oklch(0.511 0.230 276.966)` | `--primary` |
| アクセント（Emerald） | #10B981 | `oklch(0.696 0.149 162.480)` | `--success` |
| 警告（Amber） | #F59E0B | `oklch(0.769 0.165 70.080)` | `--warning` |
| 危険（Rose） | #F43F5E | `oklch(0.645 0.215 16.439)` | `--destructive` |
| 背景（Slate） | #F8FAFC | `oklch(0.984 0.003 247.858)` | `--background` |
| テキスト（Slate） | #1E293B | `oklch(0.279 0.037 260.031)` | `--foreground` |

カスタムセマンティックカラーとして `--success`/`--success-foreground` と `--warning`/`--warning-foreground` を追加し、`@theme inline` にも登録。

### 追加パッケージ

| パッケージ | 用途 |
|-----------|------|
| `class-variance-authority` | コンポーネントバリアント管理 |
| `clsx` | クラス名結合 |
| `tailwind-merge` | Tailwindクラスのマージ・重複解消 |
| `lucide-react` | アイコンライブラリ |
| `radix-ui` | shadcn/uiの基盤となるプリミティブUI |
| `tw-animate-css` | shadcn/uiアニメーション |
| `shadcn` | shadcn CLI（devDependencies） |

## Codexレビュー指摘と対応

| 指摘内容 | 重要度 | 対応 |
|---------|--------|------|
| OKLCH値がHEX目標色と不一致（primary, foreground, destructive等） | High | HEXからの正確なOKLCH変換値に修正 |
| `success-foreground`のコントラスト不足（白背景で2.4:1、AA基準4.5:1未満） | Medium | 前景色を白→濃い緑 `oklch(0.262 0.049 172.552)`（#022C22相当）に変更 |
| `--destructive-foreground` が未定義 | Low | `:root`/`.dark`/`@theme inline` すべてに追加 |

## 将来の課題

- ダークモード切り替え機能の実装（現在は `.dark` クラスによるCSS変数定義のみ）
- 必要に応じてコンポーネント追加（Table, Toast, Sheet, Tabs等）
- チャートカラー（`--chart-1`〜`--chart-5`）の最終調整はRechartsグラフ実装時に実施
