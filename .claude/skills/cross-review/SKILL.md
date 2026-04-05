---
name: cross-review
description: サブエージェント1体+Codex1体の軽量クロスレビュー。普段使い向け。修正は行わない。
user_invocable: true
---

# クロスレビュー

Claude subagent (Logic+Security) と Codex (Architecture+Testability) の2体による軽量レビュー。**修正は行わない。**

重量級の `/multi-review`（4-5体）や `/codex-multi-review`（4体）と異なり、普段使い向けの軽量構成。

## レビュアー構成

| # | エンジン | 専門領域 |
|---|---------|----------|
| A | Claude subagent (`reviewer-logic`, Opus) | ロジック・バグ + セキュリティ |
| B | Codex (`codex-companion.mjs`) | 設計・アーキテクチャ + テスタビリティ |

## 手順

### Step 1: レビュー対象の確認

1. `git diff --name-only HEAD` で変更ファイル一覧を取得（0件なら `git diff --name-only HEAD~1`）
2. ユーザーが対象を指定している場合はそちらを優先
3. ファイル一覧をユーザーに確認

### Step 2: 2レビュー並列起動

以下の2つを **1つのメッセージで並列に** 起動する。

#### A: Claude subagent (Logic + Security)

Agentツールで起動:
- `subagent_type`: `reviewer-logic`
- `model`: `opus`
- `mode`: `auto`

プロンプト:

```
以下のファイルをレビューしてください。ロジック・バグ検出に加え、セキュリティ観点も併せてチェックしてください。

追加のセキュリティ観点:
- 入力バリデーション: query params/body/path paramsのバリデーション、SQLインジェクション
- 認証・認可: ミドルウェア適用漏れ、ユーザーIDの検証（他ユーザーリソースへのアクセス制御）
- データ漏洩: エラーレスポンスに内部情報、ログに機密情報

対象:
<ファイル一覧>
```

#### B: Codex (Architecture + Testability)

1. `prompts/codex-review.md` の `プロンプトテンプレート` セクション内テキストを Read
2. `{{TARGET_FILES}}` を実際のファイル一覧で置換
3. `/tmp/prompt-cross-review.txt` に Write
4. Bash で起動（`run_in_background: true`, `timeout: 300000`）:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" task --prompt-file /tmp/prompt-cross-review.txt
```

注意:
- プロンプトは必ず `--prompt-file` で渡す（diff含むとシェル引数長制限で失敗する）
- `--write` は付けない（読み取り専用）
- `--background` は付けない（Claude Code側の `run_in_background: true` で並列化する）

### Step 3: スコアベース集約

#### 集約ルール

| 条件 | 判定 |
|------|------|
| confidence 80+ | **修正対象** |
| confidence 75-79 かつ A・B両者が同一問題を指摘 | **修正対象**（クロス検出） |
| confidence 75-79 で単独指摘 | 報告のみ |
| confidence 75未満 | フィルタアウト |

#### 集約手順

1. A・B 両方の結果が揃うまで集約しない
2. 同一箇所・同一問題の指摘をグループ化（ファイル:行番号 + 指摘内容で判定）
3. 上記ルールで修正対象を決定
4. Critical → Warning → Info の優先順でソート

#### 出力形式

```
## Cross Review Report

### 修正対象（confidence 80+ または クロス検出）

#### Critical
- [confidence: XX, reporters: A,B] ファイル:行番号 - 指摘内容

#### Warning
- [confidence: XX, reporter: A] ファイル:行番号 - 指摘内容

### 報告のみ（confidence 75-79 単独）
- [confidence: 77, reporter: B] ファイル:行番号 - 指摘内容

### 各レビュアー判定
- A (Logic+Security / Claude): LGTM / NOT LGTM
- B (Architecture+Testability / Codex): LGTM / NOT LGTM
```

## レビュー結果の判断

- **Critical指摘は実コードと突き合わせて裏取り必須**
- **偽陽性と判断したら根拠を示してスキップする**
- Warningでもプロジェクト規約違反（`as`キャスト等）は修正すべきと提案する
- Codexの行番号は実コードと一致しているか確認する
