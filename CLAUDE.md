# CLAUDE.md

## 🚫 最重要制限事項

### 開発サーバーの起動
- **開発サーバーは絶対に起動しないでください**
- ユーザー側で既に起動しているため、Claude Code側での起動は不要です
- **ポート: frontend=2460, backend API=3456**

### ブラウザ動作確認
- **「ブラウザで動作確認して」と言われた場合は、Claude in Chrome MCPを使用する**
- 手動確認を求めるのではなく、必ずClaude in Chromeで自動的に動作確認を実施すること

## プロジェクト概要

**Actiko** - 最速で活動量を記録する、極限までシンプルなUXの個人向け活動記録アプリ。

### 最重要原則
- **パフォーマンス**: 「最速で活動量を記録する」ことが最優先目標
- **UX**: 極限までシンプル、操作回数を最小限に
- **検証**: タスクが実際に完了していない場合は絶対に完了としない

## 技術スタック

- **DB: Neon Postgres**（Cloudflare D1ではない。絶対に間違えないこと）
- Cloudflare Workers + Hono
- R2（画像ストレージ）、KV（レートリミット等）
- frontend: React + Dexie.js + useLiveQuery + TanStack Router（オフラインファースト）

## 📚 詳細ドキュメント

- `/docs/knowledges/` — 設計ドキュメント（構造, 認証, DB, フロント, バックエンド）
- `apps/backend/CLAUDE.md` — バックエンド固有のルール（Honoの罠, APIパス規約）
- `apps/frontend-v2/CLAUDE.md` — フロントエンド固有のルール（オフラインファースト設計, UI規約）

## 必須コマンド

```bash
pnpm run test-once   # テスト実行（CIモード）
pnpm run tsc         # TypeScriptコンパイルチェック
pnpm run fix         # コードフォーマット（biome+eslint）
pnpm run ci-check    # 全CIチェック
pnpm run db-generate # マイグレーション生成
pnpm run db-migrate  # マイグレーション適用
```

## 重要な開発規約

### TypeScript共通ルール
- **型定義は `type` を使用**（`interface`は使わない）
- **ファクトリ関数パターン**: `newXXX`関数で依存注入
- **Repository命名**: メソッド名にドメイン名を含める（`createGoal` ✓ / `create` ✗）

### テスト・コミット前チェック
- 型エラーを全て修正し、テストも全て通らないとコミットできない
- `pnpm run test-once` → `pnpm run tsc` → `pnpm run fix` の順で確認

## 並列エージェント運用ルール

サブエージェントを並列起動する際は、**共通ルールを事前にプロンプトへ明示する**。

### 必須共通ルール（全エージェントのプロンプトに含める）
```
- APIパス: 末尾スラッシュなし
- DB: Neon Postgres（D1ではない）
- ファイル分割: 1ファイル200行以内目安、ドメインフォルダに配置
- 古いファイル: 削除する（プロキシ/再エクスポートとして残さない）
- エクスポート: バレルindex.tsでまとめる
- Repository命名: メソッド名にドメイン名を含める（createGoal ✓ / create ✗）
- 型定義: interfaceではなくtypeを使う
```

### ファイル競合防止
- 並列エージェント間で**編集対象ファイルが重複しないよう分割**する
- 事前にGlobで対象ファイルを確認し、排他的にグループ分けする
- frontend-v2の作業では `apps/frontend-v2/CLAUDE.md` の追加ルールもプロンプトに含める
