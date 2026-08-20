# CLAUDE.md

## 🚫 最重要制限事項
- **開発サーバーは起動しない**（ユーザー側で起動済み。ポートは `apps/backend/.env` の `API_PORT` と `apps/frontend/.env` の `VITE_PORT` を参照）。**ただし worktree 環境とリモート実行環境（Claude Code on the web）ではサーバーが起動していないため、自分で起動する**
- **ブラウザ動作確認はplaywright-cliを使用する**（手順は `/browser-check`、コマンドは `/playwright-cli` 参照。2026-06-12にChrome MCPから統一）
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

## 作業の委譲（トークン節約: Codex 優先）

Fable/Claude のトークン使用量を抑えるため、**手を動かす作業はデフォルトで Codex CLI に委譲する**。メイン（判断席）は判断に専念する。

**⚠ サブエージェントとして起動された場合はこの節を無視し、自分で直接実行すること（Codex・サブエージェントへの再委譲も禁止）。**

- **メインが自分でやる**: 設計判断・方針決定、ユーザーとの議論への回答、レビュー指摘の最終採否、完了判定、検証（`test-once` → `tsc` → `fix` は必ず自分で回す）、および grep 1発程度の軽い探索
- **Codex に委譲する**: 実装・修正、テスト作成、型エラー潰し、定型リファクタ、規模の大きい探索・集計、docs 定型更新

```bash
codex exec --sandbox workspace-write -o /tmp/codex-last.md \
  -c model_reasoning_effort="xhigh" "<自己完結の指示>" < /dev/null
```

- **`< /dev/null` を必ず付ける**: `codex exec` は起動時に stdin を読み、EOF にならないと「Reading additional input from stdin...」で無出力ハングすることがある。空にして即 EOF させると回避できる。**例外: `cat prompt.txt | codex exec ... -` でプロンプトを stdin 供給する場合（レビュースキル等）は `< /dev/null` を付けない**（stdin を上書きしてしまう）
- **effort は常に明示**（config 既定に依存しない）: 難課題・レビュー=`xhigh` / 通常実装=`medium` / 機械的作業=`low`
- **Codex は会話コンテキストを持たない**。指示は自己完結で: 対象パスの絶対パス・踏襲すべき既存パターンのパス・検収条件・DB/enum の定数値（`plan="premium"` 等）・参照可否を明記する。読むだけなら `--sandbox read-only`。Codex サンドボックスはネットワーク遮断なので Neon 実 DB は叩けない（テストは PGlite でローカル完結する）
- 続きの指示は `codex exec resume --last`。長時間タスクは `run_in_background: true`
- **委譲の規律**: 委譲前に反証可能な検収条件（`pnpm run test-once` / `tsc` / 出力 diff 一致等）を決めて渡し、成果物はメインが必ずレビューする。**Codex・エージェントの「全パス」報告は信用しない**（型エラー残存の実績あり）
- **Codex 不調時は Agent ツールで代替**する（`haiku`=機械的作業 / `sonnet`=通常実装 / `opus`=難課題・レビュー。worktree 運用・並列競合防止は `.claude/rules/parallel-agents.md` 参照）。fork はメインのモデルを継承し model 指定が効かないため不可

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

### 新規アプリ/パッケージ追加時のチェックリスト
- `pnpm run tsc` のチェック対象に含まれているか（tsconfig excludeに入れた場合はpnpm filter経由で個別チェックを追加）
- 各アプリ固有のCLAUDE.md（`apps/backend/CLAUDE.md`等）の規約に従っているか

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

## Baseline チェック（着手前 CI 確認）
→ `.claude/rules/baseline-check.md` 参照
