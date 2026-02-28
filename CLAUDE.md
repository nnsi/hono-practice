# CLAUDE.md

## 🚫 最重要制限事項
- **開発サーバーは起動しない**（ユーザー側で起動済み。ポート: frontend=2460, backend=3456）
- **ブラウザ動作確認はClaude in Chrome MCPを使用する**

## プロジェクト概要

**Actiko** - 最速で活動量を記録する、極限までシンプルなUXの個人向け活動記録アプリ。

## 技術スタック
- **DB: Neon Postgres**（D1ではない。絶対に間違えないこと）
- Cloudflare Workers + Hono / R2 / KV
- frontend: React + Dexie.js + useLiveQuery + TanStack Router（オフラインファースト）
- pnpmモノレポ: バージョン重複→型不一致に注意。`pnpm.overrides`で統一。tsconfig pathsとmodule resolution（`"workspace:*"`宣言）は別物

## 📚 詳細ドキュメント
- `/docs/knowledges/` — 設計ドキュメント
- `apps/backend/CLAUDE.md` — バックエンド固有ルール
- `apps/frontend-v2/CLAUDE.md` — フロントエンド固有ルール

## 必須コマンド
```bash
pnpm run test-once   # テスト実行
pnpm run tsc         # 型チェック
pnpm run fix         # フォーマット
pnpm run ci-check    # 全CIチェック
```

## 開発規約

### TypeScript
- 型定義は `type`（`interface`不可）
- ファクトリ関数 `newXXX` で依存注入
- Repository命名: メソッド名にドメイン名を含める（`createGoal` ✓ / `create` ✗）

### テスト
- `test-once` → `tsc` → `fix` の順で確認
- **新ロジック実装時はテストも追加する**（既存テスト通過≠新コードがテスト済み）
- 計画段階でテストファイルも変更対象に含める

### 問題解決
- **ワークアラウンドより根本原因を潰す**（設定hackに飛びつかず、依存バージョン統一等の根本対処を先に検討）
- **方針判断はユーザーの仕事**（選択肢を提示し、「許容」「対応不要」と勝手に判定しない）

## 並列エージェント運用

### エージェントのプロンプトに含める共通ルール
```
- APIパス末尾スラッシュなし / DB: Neon Postgres
- 1ファイル200行以内 / バレルindex.tsでエクスポート
- 古いファイルは削除（再エクスポートとして残さない）
- Repository命名: ドメイン名を含める / 型定義: type（interfaceではない）
```

### 競合防止
- 編集対象ファイルが重複しないよう事前にGlobで排他的にグループ分け
- **インターフェース変更は先に直列で実施**し、結果を後続エージェントのプロンプトに含める
- ファイル移動時は**テストファイルのimportパス更新**もプロンプトに含める
- frontend-v2の作業では `apps/frontend-v2/CLAUDE.md` のルールも含める
