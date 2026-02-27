# Issue #27 ログイン画面アクセシビリティ改善

## 対応日
2026-02-28

## ブランチ
`feature/issue-27-login-accessibility` → `develop` にマージ

## 変更ファイル一覧
| ファイル | 変更内容 |
|---------|---------|
| `src/app/(auth)/login/_components/login-form.tsx` | aria属性追加、フォーカス制御、エラー種別判定 |
| `src/app/(auth)/login/actions.ts` | LoginState型にerrorType/errorSeq追加、各エラーに種別付与 |

## 実装詳細

### 1. エラーメッセージのスクリーンリーダー通知
- エラーメッセージを `aria-live="polite"` + `aria-atomic="true"` のラッパーdivで囲んだ
- ラッパーは常にDOMに存在し、中身の`<p>`が条件レンダリングされる設計（確実なSR通知のため）

### 2. aria-invalid の条件付き付与
- `LoginState`に`errorType`フィールドを追加（`"credentials" | "rate_limit" | "system"`）
- `aria-invalid`は`errorType === "credentials"`の場合のみ付与
- レート制限やシステムエラーは入力値の問題ではないため除外

### 3. フォーカス制御
- 認証失敗時のみメール入力欄にフォーカス移動（再入力しやすい導線）
- レート制限・システムエラーはaria-liveによるSR通知のみ（フォーカス移動なし）
- `useRef`でメール入力欄を参照し、`useEffect`で制御

### 4. aria-describedby
- エラー発生時にメール・パスワード両方のフィールドに`aria-describedby="login-error"`を付与
- エラーがない場合は`undefined`（属性自体が出力されない）

### 5. aria-busy
- `<form>`要素に`aria-busy={pending}`を付与
- 送信中の状態をSRに通知

### 6. errorSeq（連番）による再通知保証
- `LoginState`に`errorSeq`フィールドを追加
- 同一エラーメッセージが連続しても`errorSeq`が変わるため、`useEffect`が再実行される

## レビュー指摘と対応（Codex Review）

| 指摘 | 対応 |
|------|------|
| aria-invalidの付与条件が広すぎる（レート制限・システムエラーでも付く） | errorTypeで認証失敗時のみに限定 |
| 同一メッセージ再発時にuseEffectが再実行されない | errorSeq連番を追加 |
| エラーメッセージへの強制フォーカスがUXを阻害 | 認証失敗時はメール欄にフォーカス、他はaria-liveのみ |

## 将来の課題
- shadcn/ui Inputコンポーネントが`aria-invalid`時の視覚スタイル（赤枠）を既にサポートしている点は確認済み
- 送信中のSR通知をさらに強化する場合は、進行テキスト用の追加aria-live領域を検討
