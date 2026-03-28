# CLAUDE.md

## 🚫 最重要制限事項
- **開発サーバーは起動しない**（ユーザー側で起動済み。ポートは `apps/backend/.env.local` の `API_PORT` と `apps/frontend/vite.config.ts` を参照）。**ただし worktree 環境ではポートが分離されているため、自分で起動してよい**
- **ブラウザ動作確認はClaude in Chrome MCPを使用する**
- **デプロイは勝手にやらない**（`wrangler deploy`, `eas-cli update` 等の本番反映コマンドは必ずユーザーの明示的な承認を得てから実行する）
- **EAS Buildは慎重に扱う**（ビルドはリモートサーバーで実行され、時間とコストがかかる。CLIの出力が途中で止まって見えても、`eas-cli build:list` でEAS側の状態を確認してから判断する。二重投入しない）

## プロジェクト概要

**Actiko** - 最速で活動量を記録する、極限までシンプルなUXの個人向け活動記録アプリ。

## 技術スタック
- **DB: Neon Postgres**（D1ではない。絶対に間違えないこと）
- Cloudflare Workers + Hono / R2 / KV
- frontend: React + Dexie.js + useLiveQuery + TanStack Router（オフラインファースト）
- pnpmモノレポ: バージョン重複→型不一致に注意。`pnpm.overrides`で統一。tsconfig pathsとmodule resolution（`"workspace:*"`宣言）は別物

## 📚 詳細ドキュメント
- `apps/backend/CLAUDE.md` — バックエンド固有ルール
- `apps/frontend/CLAUDE.md` — フロントエンド固有ルール
- `apps/mobile/CLAUDE.md` — モバイル固有ルール
- `docs/adr/` — 設計判断の記録

## 必須コマンド
```bash
pnpm run test-once   # テスト実行
pnpm run tsc         # 型チェック
pnpm run fix         # フォーマット
pnpm run ci-check    # 全CIチェック
```

## 開発規約

### TypeScript
- Repository命名: メソッド名にドメイン名を含める（`createGoal` ✓ / `create` ✗）
- 詳細は `apps/backend/CLAUDE.md` のアーキテクチャセクション参照

### テスト
- `test-once` → `tsc` → `fix` の順で確認
- **新ロジック実装時はテストも追加する**（既存テスト通過≠新コードがテスト済み）
- 計画段階でテストファイルも変更対象に含める
- **実装を変えたらまずテストファイルを開く**（テストが旧挙動を期待していないか確認する）
- **テスト失敗は100%自分の変更が原因**（CIは常に通る前提で運用されている。「既存の問題かも」と思わず、自分の変更を疑う）

### 完了の定義
- テスト・型チェック通過は最低ライン。以下を満たして初めて「完了」:
  - **UI変更** → ブラウザで実際に操作して確認（表示されているだけでは不十分）
  - **DB変更** → マイグレーション適用 + APIが200を返す + DBにデータが入っていることまで確認
  - **Web/Mobile両対応** → 両プラットフォームで確認

### 問題解決
- **ワークアラウンドより根本原因を潰す**（設定hackに飛びつかず、依存バージョン統一等の根本対処を先に検討）
- **方針判断はユーザーの仕事**（選択肢を提示し、「許容」「対応不要」と勝手に判定しない）
- **手段と目的を混同しない**: 特定のファイル・方法に固執せず「そもそもの問題は何か」を自問する。複雑な解決策を書く前に「もっと単純な方法はないか」を考える
- **共通化はエージェント運用の観点で判断する**: 技術的コストだけでなく「1箇所直せば全プラットフォームに反映」の運用価値を先に想起する

## 並列エージェント運用
→ `.claude/rules/parallel-agents.md` 参照
