# Issue #4: Prisma Client シングルトン + DB アクセス層

- **対応日**: 2026-02-24
- **ブランチ**: `feature/issue-4-prisma-singleton`
- **ステータス**: 完了（developマージ済み、Issue クローズ済み）

## 対応内容

### 作成・変更ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/lib/db.ts` | 変更 | シングルトンパターン実装、エクスポート名を `db` に統一、Prisma v7 型回避策の改善 |

### 実装詳細

#### シングルトンパターン

```ts
export const db = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db
}
```

- 開発時（`NODE_ENV !== "production"`）のみ `globalThis.__prisma` にキャッシュ
- Next.js のホットリロードで Prisma Client が多重インスタンス化するのを防止
- `import { db } from "@/lib/db"` で利用可能

#### globalThis キー名

- `db`（汎用的）→ `__prisma`（専用名）に変更
- `declare global { var __prisma: PrismaClient | undefined }` で型安全に宣言
- 他コードとの衝突リスクを低減

#### Prisma v7 型制約回避

- `createPrismaClient()` 関数に回避策を局所化
- Prisma v7 では `PrismaClientOptions` に `adapter` か `accelerateUrl` が必須型だが、SQLite ではどちらも不要
- 将来 Prisma 側が修正された際に差し替えポイントが明確

#### importパス

- `@/generated/prisma/client` を使用（`@prisma/client` ではない）
- `prisma/schema.prisma` の `output = "../src/generated/prisma"` 設定に合致

### 設計判断

| 判断事項 | 決定 | 理由 |
|---------|------|------|
| エクスポート名 | `db` | Issue #4 指定、CLAUDE.md の記載と一致 |
| importパス | `@/generated/prisma/client` | schema.prisma の output 設定に合わせる |
| globalThis キー名 | `__prisma` | 汎用的な `db` より衝突リスクが低い（Codex指摘） |
| 型回避策 | `createPrismaClient()` に局所化 | 将来の差し替えを容易にする（Codex指摘） |
| 互換エイリアス | 不要（削除） | 既存コードで `prisma` をインポートしている箇所がないため |

## Codex レビュー（3回実施）

### 第1回: 設計相談

| # | ポイント | Codex判断 |
|---|---------|-----------|
| 1 | エクスポート名 `prisma` vs `db` | `db` に統一すべき |
| 2 | importパス | `@/generated/prisma/client` を維持（schema output 設定に合致） |
| 3 | Prisma v7 型回避策 | 短期的には許容、長期的には SQLite アダプタ導入が本筋 |
| 4 | 互換エイリアス `export const prisma = db` | 段階移行用に提案 |

### 第2回: コードレビュー

| # | 重要度 | 指摘内容 | 対応 |
|---|-------|---------|------|
| 1 | Low | `globalThis` キー `db` が汎用的すぎ | `__prisma` に変更、`declare global` で型付け |
| 2 | Low | Prisma v7 型回避策が直書き | `createPrismaClient()` 関数に閉じ込め |

### 第3回: 最終レビュー

- **判定**: LGTM（承認）
- 前回指摘の2点が適切に反映されていることを確認

## 将来の課題

- Prisma v7 の `PrismaClientOptions` 型問題が公式修正されたら `createPrismaClient()` 内の型回避を解消
- SQLite アダプタ（`@prisma/adapter-better-sqlite3`）導入で型安全なコンストラクタに移行する選択肢あり
