---
name: codex-multi-review
description: Codex 4体（+ネイティブ1体）に専門レビュアーロールを割り当てて並列レビュー。トークン消費を抑えた軽量版multi-review。修正は行わない。
user_invocable: true
---

# Codex マルチレビュー

Codexプラグイン（`codex-companion.mjs task`）を使い、4つの専門レビュアーを並列起動する。Claudeのコンテキストを消費しないため `/multi-review` より軽量。**修正は行わない。**

## レビュアー構成

### 常時起動（4 Codex）

| # | ロール | プロンプト | 専門領域 |
|---|--------|-----------|----------|
| A | Security | `prompts/security.md` | セキュリティ |
| B | Logic | `prompts/logic.md` | ロジック・バグ |
| C | Architecture | `prompts/architecture.md` | 設計・アーキテクチャ |
| D | Testability | `prompts/testability.md` | テスタビリティ・テスト網羅性 |

### 条件付き起動（ネイティブコード含む場合のみ +1）

| # | ロール | プロンプト | 専門領域 |
|---|--------|-----------|----------|
| E | Native | `prompts/native.md` | Swift/Kotlin |

**起動条件**: レビュー対象に `.swift` または `.kt` ファイルが含まれる場合。

## 手順

### Step 1: レビュー対象の確認

1. **ディレクトリの存在を必ずGlobで確認する**
2. レビュー対象のファイル一覧を取得
3. **ネイティブコード判定**: `.swift` / `.kt` ファイルが含まれるかGlobで確認
4. ユーザーにレビュー対象を確認

### Step 2: 全Codex並列起動

各プロンプトファイルの `プロンプトテンプレート` セクション内のテキストを読み取り、`{{TARGET_FILES}}` をファイル一覧に置換する。**E (Native) にはSwift/Kotlinファイルのみ渡す。**

4-5個のBashツール呼び出しを**1つのメッセージで並列実行**する。**レビュアーを省略しない。全員起動が必須。**

各プロンプトを `/tmp/prompt-{role}.txt` に書き出し、`--prompt-file` で渡す。

```bash
# 各レビュアーを並列起動（run_in_background: true）
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" task --prompt-file /tmp/prompt-security.txt
```

注意:
- **プロンプトは必ず `--prompt-file` で渡す**（diffを含むと60KB超になり、シェルの引数長制限 `Argument list too long` で失敗する）
- `--write` は付けない（読み取り専用）
- `--background` は付けない（Claude Code側の `run_in_background: true` で並列化する）
- Bashの `timeout` は `300000`（5分）

### Step 3: 結果収集

各Bashの完了通知を待ち、stdoutからレビュー結果を読み取る。

**結果が空または構造化されていない場合はリトライする。全レビュアーの結果が揃うまで集約しない。**

### Step 4: スコアベース集約

#### 集約ルール

| 条件 | 判定 |
|------|------|
| confidence 80以上 | **修正対象** |
| confidence 75-79 だが、2人以上のレビュアーが同一箇所/同一問題に75以上を付与 | **修正対象** |
| confidence 75-79 で単独指摘 | 報告のみ |
| confidence 75未満 | レビュアー側でフィルタ済み |

#### 集約手順

1. 全レビュアーの結果を一覧化
2. 同一箇所・同一問題の指摘をグループ化（ファイル:行番号 + 指摘内容で判定）
3. 上記ルールで修正対象を決定
4. Critical → Warning → Infoの優先順でソート

#### 出力形式

```
## 修正対象（confidence 80+ または 2人以上が75+）

### Critical
- [confidence: XX, reporters: A,C] ファイル:行番号 - 指摘内容

### Warning
- [confidence: XX, reporters: B] ファイル:行番号 - 指摘内容

### Info
- [confidence: XX, reporters: D] ファイル:行番号 - 指摘内容

## 報告のみ（confidence 75-79 単独）
- [confidence: 77, reporter: A] ファイル:行番号 - 指摘内容

## 各レビュアー判定
- A (Security): LGTM / NOT LGTM
- B (Logic): LGTM / NOT LGTM
- C (Architecture): LGTM / NOT LGTM
- D (Testability): LGTM / NOT LGTM
- E (Native): LGTM / NOT LGTM ※ネイティブコード含む場合のみ
```

## レビュー結果の判断

- **Critical指摘は実コードと突き合わせて裏取り必須**: Codexはプロジェクトコンテキスト（DB実カラム名、ランタイム環境特性等）を持たないことがある。`tsc`結果や実行結果など客観的証拠で判断する
- **偽陽性と判断したら根拠を示してスキップする**
- Warningでもプロジェクト規約違反（`as`キャスト等）は修正すべきと提案する

## 注意事項

- **計画書レビューと実装レビューは別物**: 計画書のレビュー済み≠実装コードのレビュー済み
- Codexの行番号やコード引用は実コードと一致しているか確認する（不安定な場合がある）
