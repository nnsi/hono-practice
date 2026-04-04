---
name: multi-review
description: 最大5サブエージェントを並列起動し、スコアベースで集約したレビューレポートを出力する。修正は行わない。
user_invocable: true
---

# マルチレビュー

専門サブエージェント（`.claude/agents/reviewer-*.md`）を並列起動し、スコアベースで集約したレビューレポートを出力する。**修正は行わない**（修正込みのサイクルは `/review-cycle` を使う）。

Codex版は `/codex-multi-review` を使う。

## レビュアー構成

### 常時起動（4レビュアー）

| # | 名前 | モデル | 専門領域 |
|---|------|--------|----------|
| A | reviewer-security | Sonnet | セキュリティ |
| B | reviewer-logic | Sonnet | ロジック・バグ |
| C | reviewer-architecture | Opus | 設計・アーキテクチャ |
| D | reviewer-testability | Sonnet | テスタビリティ・テスト網羅性 |

### 条件付き起動（ネイティブコード含む場合のみ +1）

| # | 名前 | モデル | 専門領域 |
|---|------|--------|----------|
| E | reviewer-native | Sonnet | Swift/Kotlin（ウィジェット、共有DB、iOS/Android対称性） |

**起動条件**: レビュー対象に `.swift` または `.kt` ファイルが含まれる場合。

## 手順

### Step 1: レビュー対象の確認

1. **ディレクトリの存在を必ずGlobで確認する**（エージェントの報告を鵜呑みにしない）
2. レビュー対象のファイル一覧を取得
3. **ネイティブコード判定**: レビュー対象に `.swift` / `.kt` ファイルが含まれるかGlobで確認
4. ユーザーにレビュー対象を確認（ネイティブレビュアーEの起動有無も明示）

### Step 2: 全レビュアー並列起動

全レビュアーを**同時に**起動する（ネイティブコードなしなら4、ありなら5）。**レビュアーを省略しない。全員起動が必須。**

`.claude/agents/` にエージェント定義済み。Agentツールで起動する:

```
# 各エージェントに渡すプロンプト例
"以下のファイルをレビューしてください。\n\n対象:\n<ファイル一覧>"
```

起動パラメータ:
- **name**: `reviewer-security` / `reviewer-logic` / `reviewer-architecture` / `reviewer-testability` （+ `reviewer-native`）
- **model**: エージェント定義側で指定済み（A,B,D,E=sonnet / C=opus）

全Agentツール呼び出しを**1つのメッセージで並列実行**すること。

**E (reviewer-native) にはSwift/Kotlinファイルのみ渡す。**

### Step 3: スコアベース集約

#### 集約ルール

| 条件 | 判定 |
|------|------|
| confidence 80以上 | **修正対象** |
| confidence 75-79 だが、2人以上のレビュアーが同一箇所/同一問題に75以上を付与 | **修正対象** |
| confidence 75-79 で単独指摘 | 報告のみ |
| confidence 75未満 | レビュアー側でフィルタ済み（報告されない） |

#### 集約手順

1. **全レビュアーの結果が揃うまで集約しない**（1つでも欠けたらリトライ）
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

- **Critical指摘は実コードと突き合わせて裏取り必須**: レビュアーはプロジェクトコンテキスト（DB実カラム名、ランタイム環境特性等）を持たないことがある。`tsc`結果や実行結果など客観的証拠で判断する
- **偽陽性と判断したら根拠を示してスキップする**。正しいコードを壊すリスクの方が高い
- Warningでもプロジェクト規約違反（`as`キャスト等）は修正すべきと提案する

## 注意事項

- **計画書レビューと実装レビューは別物**: 計画書のレビュー済み≠実装コードのレビュー済み
