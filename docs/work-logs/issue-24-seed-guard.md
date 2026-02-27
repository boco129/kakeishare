# Issue #24: seed スクリプトに本番保護ガードを追加

## 対応日
2026-02-28

## ブランチ
`feature/issue-24-seed-guard`

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `prisma/seed-guard.ts` | 本番DB保護ガード関数 `assertSafeToSeed()` |
| `src/lib/seed-guard.test.ts` | ガード関数の単体テスト（29件） |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `prisma/seed.ts` | `assertSafeToSeed()` のimportと `runSeed()` 内でのガード呼び出し追加 |

## 実装詳細

### ガード関数 `assertSafeToSeed()`

1. **allowlist方式**: 許可されたSQLiteパスのみ通過、それ以外は全て拒否
   - 完全一致: `file:./prisma/dev.db`（CWD相対で解決）
   - プレフィックス一致: `/tmp/`, `/private/tmp/`, `/var/folders/`, `/private/var/folders/`（テスト用一時DB）

2. **パストラバーサル対策**: `file:` プレフィックス除去後に `path.resolve()` で `../` を正規化

3. **symlink対策**: `fs.realpathSync()` で実体パスを解決してからallowlist判定
   - 既存ファイル: 実体パスで判定
   - 新規ファイル: 親ディレクトリのsymlink解決で判定

4. **NODE_ENV検査**: `trim().toLowerCase()` で正規化後、`production` と一致したら拒否

5. **空値チェック**: `DATABASE_URL` が空文字・空白のみの場合は `--force` でもバイパス不可

6. **--forceフラグ**: `process.argv.includes("--force")` で判定、全ガードをバイパス

7. **戻り値**: 検証済み（trim済み）の `DATABASE_URL` を返し、`seed.ts` 側で一貫して使用

### DI設計
テストで `env`, `argv`, `defaultDatabaseUrl` を注入可能。`process.env` / `process.argv` への依存なしでテスト可能。

## レビュー指摘と対応

Codex（GPT-5.3）による5回のレビューを実施。

| 回 | 重要度 | 指摘内容 | 対応 |
|----|--------|---------|------|
| R1 | High | denylistではなくallowlistにすべき | `file:` スキームのみ許可に変更 |
| R1 | Medium | NODE_ENVの `trim().toLowerCase()` が必要 | 対応済み |
| R1 | Medium | DATABASE_URLの空文字・前後空白を未考慮 | `trim()` と空値チェック追加 |
| R2 | High | `file:` 無条件許可は危険 | 厳密allowlist（完全一致+プレフィックス一致）に変更 |
| R2 | Medium | ガード判定URLと実行URLが不一致 | 戻り値で検証済みURLを返す設計に変更 |
| R3 | High | パストラバーサルで回避可能 | `path.resolve()` でパス正規化 |
| R3 | Medium | `--force` 時に空URLが通過 | 空値チェックを `--force` より前に移動 |
| R4 | Medium | symlink経由でallowlistをすり抜け可能 | `fs.realpathSync()` による実体パス解決 |
| R5 | Low | symlink拒否ケースのテスト未検証 | allow内→allow外symlinkの拒否テスト追加 |

## テスト結果
- seed-guard単体テスト: 29件パス
- 全体テスト: 97件パス

## 将来の課題
- Linux環境でのテスト実行確認（macOS固有の `/private/tmp/` 等）
- CI環境での一時ディレクトリパスが `ALLOWED_PREFIX_PATHS` に含まれるか確認
