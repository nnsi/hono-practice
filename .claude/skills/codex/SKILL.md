---
name: codex
description: OpenAI Codex CLIを使ってコードレビュー・分析・質問・実装を実行する。トリガー: "codex", "/codex", "codexで〜", "codexに聞いて"
user_invocable: true
---

# Codex CLI Skill

Codex CLI をBashから呼び出し、結果を報告するスキル。

## 基本方針

- 結果は `-o`（`--output-last-message`）でファイルに書き出し、Readツールで読み取って報告する
- 出力先: `%TEMP%\codex-output.md`（Windows環境で確実に書ける場所）
- デフォルトは `--sandbox read-only`（安全な分析用）。実装タスクのみ `--sandbox workspace-write`
- プロジェクトディレクトリは `-C D:\workspace\cpa-study-note` を指定
- タイムアウトは300秒（5分）に設定

## コマンドテンプレート

### 1. 汎用タスク（分析・質問・調査）

```bash
codex exec --full-auto --sandbox read-only -C "D:\workspace\cpa-study-note" -o "%TEMP%\codex-output.md" "<依頼内容>"
```

### 2. コードレビュー（未コミット変更）

```bash
codex exec review --uncommitted --full-auto -C "D:\workspace\cpa-study-note" -o "%TEMP%\codex-output.md"
```

### 3. コードレビュー（ブランチ差分）

```bash
codex exec review --base main --full-auto -C "D:\workspace\cpa-study-note" -o "%TEMP%\codex-output.md"
```

### 4. コードレビュー（特定コミット）

```bash
codex exec review --commit <SHA> --full-auto -C "D:\workspace\cpa-study-note" -o "%TEMP%\codex-output.md"
```

### 5. 実装タスク（ファイル書き込みあり）

```bash
codex exec --full-auto --sandbox workspace-write -C "D:\workspace\cpa-study-note" -o "%TEMP%\codex-output.md" "<依頼内容>"
```

### 6. セッションを続ける

`resume --last` でセッションを継続可能。コンテキストを保ったままレビューをしてもらう時などに使う:

```bash
codex exec resume --last --full-auto --sandbox read-only -C "D:\workspace\cpa-study-note" -o "%TEMP%\codex-output.md" "<依頼内容>"
```

## 実行手順

1. ユーザーの依頼内容からタスク種別を判定（分析/レビュー/実装）
2. 適切なコマンドテンプレートを選択
3. Bashツールで実行（timeout: 300000）
4. `-o` で指定したファイルをReadツールで読み取り
5. 結果をユーザーに日本語で要約して報告

## 注意事項

- `--full-auto` は承認プロンプトをスキップする。実装タスクでは実行前にユーザーへ確認を取ること
- Codexの出力が長い場合はサブエージェントに委譲してコンテキスト節約
- 出力ファイルのパスは毎回一意にする必要はない（上書きで問題ない）
