---
name: codex
description: Codex CLIを使ってコードレビュー・分析・質問・実装を実行する。文中にcodexという文字列があれば発動。
user_invocable: true
---

# Codex CLI Skill (v0.111+)

Codex CLI をBashから呼び出し、結果を報告するスキル。

## 共通設定

| 項目 | 値 |
|------|------|
| 出力先 | `%TEMP%\codex-output.md`（`-o` フラグ） |
| プロジェクト | `-C "D:\workspace\hono-practice"` |
| Bashタイムアウト | 300000ms（5分） |
| デフォルトsandbox | `read-only`（分析用） |

## コマンドリファレンス

### 1. 汎用タスク（分析・質問・調査）

```bash
codex exec --full-auto --sandbox read-only -C "D:\workspace\hono-practice" -o "%TEMP%\codex-output.md" "<依頼内容>"
```

### 2. コードレビュー

```bash
# 未コミット変更
codex exec review --uncommitted --full-auto -C "D:\workspace\hono-practice" -o "%TEMP%\codex-output.md"

# ブランチ差分
codex exec review --base main --full-auto -C "D:\workspace\hono-practice" -o "%TEMP%\codex-output.md"

# 特定コミット（--title でコミットメッセージを渡すと精度向上）
codex exec review --commit <SHA> --title "<コミットタイトル>" --full-auto -C "D:\workspace\hono-practice" -o "%TEMP%\codex-output.md"

# カスタム指示付きレビュー
codex exec review --uncommitted --full-auto -C "D:\workspace\hono-practice" -o "%TEMP%\codex-output.md" "<レビュー観点>"
```

### 3. 実装タスク（ファイル書き込みあり）

sandbox を `workspace-write` に昇格。**実行前にユーザーへ確認を取ること。**

```bash
codex exec --full-auto --sandbox workspace-write -C "D:\workspace\hono-practice" -o "%TEMP%\codex-output.md" "<依頼内容>"
```

### 4. セッション継続（resume）

前回のセッションのトランスクリプト・計画・承認履歴を保持したまま追加指示を送る。

```bash
# 直前のセッションを継続
codex exec resume --last --full-auto -o "%TEMP%\codex-output.md" "<追加指示>"

# 特定セッションをID指定で継続
codex exec resume <SESSION_ID> --full-auto -o "%TEMP%\codex-output.md" "<追加指示>"

# 全ディレクトリのセッションから選択（cwdフィルタ解除）
codex exec resume --last --all --full-auto -o "%TEMP%\codex-output.md" "<追加指示>"
```

**resumeの活用パターン:**
- レビュー後に「指摘箇所を修正して」と続ける
- 分析後に「その結果を踏まえてリファクタして」と続ける
- 長い調査を分割して段階的に深掘りする

### 5. 追加フラグ一覧

| フラグ | 用途 |
|--------|------|
| `--json` | JSONL形式でイベントストリーム出力 |
| `--ephemeral` | セッションファイルをディスクに保存しない |
| `--skip-git-repo-check` | Gitリポジトリ外でも実行可能にする |
| `--add-dir <DIR>` | 追加の書き込み可能ディレクトリを指定 |
| `-i <FILE>` | 画像ファイルを添付（マルチモーダル入力） |
| `--output-schema <FILE>` | JSON Schemaで構造化レスポンスを要求 |

## 実行手順

1. ユーザーの依頼内容からタスク種別を判定（分析/レビュー/実装/セッション継続）
2. 適切なコマンドテンプレートを選択
3. Bashツールで実行（timeout: 300000）
4. `-o` で指定したファイルをReadツールで読み取り
5. 結果をユーザーに日本語で要約して報告

## セッション管理の方針

- **単発タスク**: そのまま `codex exec` で実行
- **反復タスク**（レビュー→修正→再レビュー等）: 初回実行後、`resume --last` で文脈を維持して続ける
- **並列実行**: 出力ファイルを分けること（例: `%TEMP%\codex-review.md`, `%TEMP%\codex-analysis.md`）

## 注意事項

- `--full-auto` は承認プロンプトをスキップする。実装タスクでは実行前にユーザーへ確認を取ること
- Codexの出力が長い場合はサブエージェントに委譲してコンテキスト節約
- 出力ファイルのパスは並列実行時以外は上書きで問題ない
- resume時は `-C` を省略可（前回セッションのcwdが引き継がれる）
