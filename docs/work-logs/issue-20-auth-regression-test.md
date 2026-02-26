# Issue #20: 認証フロー回帰テスト

## 対応日
2026-02-26

## ブランチ
`feature/issue-20-auth-regression-test`（develop から分岐）

## 作成・変更ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `src/lib/auth/safe-redirect-path.ts` | 新規 | safeRedirectPath() を純粋関数として切り出し |
| `src/lib/auth/safe-redirect-path.test.ts` | 新規 | Vitest 単体テスト 7件 |
| `e2e/auth-flow.spec.ts` | 新規 | Playwright E2E 認証フロー回帰テスト 8件 |
| `e2e/auth-redirect.spec.ts` | 削除 | auth-flow.spec.ts に統合 |
| `src/app/(auth)/login/actions.ts` | 変更 | safeRedirectPath を import に置き換え |
| `src/components/layout/logout-button.tsx` | 変更 | data-testid="logout-button" 追加 |

## 実装詳細

### safeRedirectPath 切り出し
- `actions.ts` 内の private 関数を `src/lib/auth/safe-redirect-path.ts` に移動
- `"use server"` ディレクティブに依存しない純粋関数としてテスト可能に

### 単体テスト（Vitest） — 7件
| テストケース | 入力 | 期待値 |
|------------|------|--------|
| 正常な相対パス | `/expenses` | `/expenses` |
| プロトコル相対URL | `//evil.com` | `/` |
| 外部URL（フラグメント付き） | `https://evil.com/x#pwn` | `/` |
| 空文字列 | `""` | `/` |
| クエリパラメータ付き | `/expenses?page=2` | `/expenses?page=2` |
| クエリ・ハッシュ付き | `/expenses?month=2026-02#summary` | `/expenses?month=2026-02#summary` |
| ルートパス | `/` | `/` |

### E2E統合テスト（Playwright） — 8件
| テストケース | プロジェクト | 検証内容 |
|------------|------------|---------|
| 正しい認証情報でログイン → / へ遷移 | unauth | ログイン成功フロー |
| 不正パスワードでログイン → エラーメッセージ表示 | unauth | エラーハンドリング |
| 未認証で / アクセス → /login にリダイレクト | unauth | ルート保護（ルートパス） |
| 未認証で /expenses アクセス → /login にリダイレクト | unauth | ルート保護（サブパス） |
| callbackUrl 付きログイン後にその URL へ遷移 | unauth | callbackUrl 復元 |
| 外部 callbackUrl 指定でも外部遷移せず / にフォールバック | unauth | オープンリダイレクト防御 |
| ログアウト → /login に戻る | mobile/desktop | ログアウトフロー |
| ログイン済みで /login アクセス → / にリダイレクト | mobile/desktop | 認証済みリダイレクト |

### ログアウトボタンのセレクタ改善
- `data-testid="logout-button"` を付与して E2E で安定的にターゲット可能に
- サイドバーと設定ページの両方に LogoutButton が存在するため、`filter({ visible: true }).first()` で可視要素を優先選択

## レビュー指摘と対応

### Codex レビュー（1回目）: 条件付き承認
1. **Medium**: `auth-redirect.spec.ts` 削除により「未認証で `/` → `/login`」テストが欠落
   - → `auth-flow.spec.ts` にテスト追加で対応
2. **Low**: 外部 callbackUrl のセキュリティ統合検証が不足
   - → 「外部 callbackUrl 指定でも外部遷移せず `/` にフォールバック」テスト追加で対応

### Codex レビュー（2回目）: 承認
- 指摘事項2点の反映を確認し、正式承認

## 将来の課題
- middleware の callbackUrl 付きリダイレクトが dev モードで安定しない（layout.tsx の `redirect("/login")` が先に効く場合がある）。CI（production build）では middleware が正しく動作する可能性があるため、CI 環境での検証が望ましい
