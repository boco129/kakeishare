# Issue #6: NextAuth v5 Credentials 認証基盤

- **対応日**: 2026-02-24
- **ブランチ**: `feature/issue-6-nextauth-credentials`
- **ステータス**: 完了（developマージ済み、Issue クローズ済み）

## 対応内容

### 作成・変更ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/auth.ts` | 新規 | NextAuth v5設定（Credentials + bcrypt + JWT callbacks） |
| `src/app/api/auth/[...nextauth]/route.ts` | 新規 | APIルートハンドラー |
| `src/types/next-auth.d.ts` | 新規 | 型拡張（Session.user に id/role） |
| `.env.example` | 変更 | AUTH_SECRET / AUTH_URL に更新 |
| `CLAUDE.md` | 変更 | 技術スタック v5 記載、ディレクトリ構成更新 |
| `package.json` | 変更 | next-auth v5.0.0-beta.30 へアップグレード |

### 実装詳細

- **認証方式**: Credentials プロバイダー（メール + パスワード）
- **セッション戦略**: JWT
- **パスワード照合**: bcryptjs
- **入力バリデーション**: Zod（email は trim + lowercase 正規化）
- **セキュリティ対策**:
  - タイミング攻撃対策（ユーザー不在時もダミーハッシュで bcrypt.compare 実行）
  - 型ガード `isAppRole` による安全な型絞り込み（as キャスト排除）
  - JWT 型は optional（`id?`, `role?`）で初期トークンの未設定に対応

### Codex レビュー指摘と対応

| # | 重要度 | 指摘内容 | 対応 |
|---|-------|---------|------|
| 1 | High | ブルートフォース耐性がない | 将来対応（Redis/Upstash等が必要） |
| 2 | Medium | JWT型が実態より厳しすぎる + as キャスト | optional 型 + 型ガードで修正済み |
| 3 | Medium | メールアドレス正規化不足 | trim + lowercase 追加済み |
| 4 | Low | CLAUDE.md のパス不一致 | ディレクトリ構成を更新済み |

### 再レビューでの追加指摘

| # | 重要度 | 指摘内容 | 対応 |
|---|-------|---------|------|
| 1 | Medium | Session.user の id/role も optional にすべき | 意図的に必須のまま維持（ガード付きで代入） |
| 2 | Low-Medium | as キャスト残存 | 型ガード isAppRole + typeof で解消済み |
| 3 | Medium | ユーザー作成/更新時のメール正規化も必要 | 将来対応 |

## 将来の課題

- ブルートフォース対策（IP + email 単位のレート制限）
- ユーザー作成/更新時のメールアドレス正規化の統一
- next-auth v5 の正式リリース時にバージョン固定の見直し

## 環境変数

```env
AUTH_SECRET="<openssl rand -base64 32 で生成>"
AUTH_URL="http://localhost:3000"
```
