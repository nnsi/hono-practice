---
name: multi-review
description: 最大8レビュアー（最大5サブエージェント + 最大3 Codex）を並列起動し、スコアベースで集約したレビューレポートを出力する。修正は行わない。
user_invocable: true
---

# マルチレビュー

専門レビュアーを並列起動し、スコアベースで集約したレビューレポートを出力する。**修正は行わない**（修正込みのサイクルは `/review-cycle` を使う）。

## レビュアー構成

### 常時起動（6レビュアー）

| # | 名前 | 種別 | モデル | 専門領域 |
|---|------|------|--------|----------|
| A | reviewer-security | エージェント定義 | Sonnet | セキュリティ |
| B | reviewer-logic | エージェント定義 | Sonnet | ロジック・バグ |
| C | reviewer-architecture | エージェント定義 | Opus | 設計・アーキテクチャ |
| D | reviewer-testability | エージェント定義 | Sonnet | テスタビリティ・テスト網羅性 |
| E | Codex-Design | Codex CLI | - | 設計・ロジック・バグ |
| F | Codex-Test | Codex CLI | - | テスタビリティ・テスト網羅性 |

### 条件付き起動（ネイティブコード含む場合のみ +2）

| # | 名前 | 種別 | モデル | 専門領域 |
|---|------|------|--------|----------|
| G | reviewer-native | エージェント定義 | Sonnet | Swift/Kotlin（ウィジェット、共有DB、iOS/Android対称性） |
| H | Codex-Native | Codex CLI | - | Swift/Kotlin（コンパイル安全性、ライフサイクル） |

**起動条件**: レビュー対象に `.swift` または `.kt` ファイルが含まれる場合。

## 手順

### Step 1: レビュー対象の確認

1. **ディレクトリの存在を必ずGlobで確認する**（エージェントの報告を鵜呑みにしない）
2. レビュー対象のファイル一覧を取得
3. **ネイティブコード判定**: レビュー対象に `.swift` / `.kt` ファイルが含まれるかGlobで確認
4. ユーザーにレビュー対象を確認（ネイティブレビュアーG,Hの起動有無も明示）

### Step 2: 全レビュアー並列起動

全レビュアーを**同時に**起動する（ネイティブコードなしなら6、ありなら8）。**レビュアーを省略しない。全員起動が必須。**

#### サブエージェント A-D（+G）の起動方法

`.claude/agents/` にエージェント定義済み。Agentツールで起動する:

```
# 各エージェントに渡すプロンプト例
"以下のファイルをレビューしてください。\n\n対象:\n<ファイル一覧>"
```

起動パラメータ:
- **name**: `reviewer-security` / `reviewer-logic` / `reviewer-architecture` / `reviewer-testability` （+ `reviewer-native`）
- **mode**: エージェント定義側で`disallowedTools: Write, Edit`を設定済み。読み取り専用
- **model**: エージェント定義側で指定済み（A,B,D,G=sonnet / C=opus）

全Agentツール呼び出しを**1つのメッセージで並列実行**すること。

**G (reviewer-native) にはSwift/Kotlinファイルのみ渡す。**

#### Codex E-F（+H）の起動方法

プロンプトテンプレート:
- E: `prompts/codex-design-logic.md`
- F: `prompts/codex-testability.md`
- H: `prompts/codex-native.md`（ネイティブコード含む場合のみ）

`{{TARGET_FILES}}` をレビュー対象ファイル一覧に置換して実行。**H にはSwift/Kotlinファイルのみ渡す。**

**`-o` は使わず stdout で結果を受け取る**:

```bash
codex exec --full-auto --sandbox read-only -C "$PROJECT_ROOT" "<プロンプト>"
```

全Bashツール呼び出しも**並列実行**すること。

**Codexが構造化された結果を返さなかった場合、stdoutを再確認。結果が空ならリトライする。**

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
- [confidence: XX, reporters: D,F] ファイル:行番号 - 指摘内容

## 報告のみ（confidence 75-79 単独）
- [confidence: 77, reporter: E] ファイル:行番号 - 指摘内容

## 各レビュアー判定
- A (Security): LGTM / NOT LGTM
- B (Logic): LGTM / NOT LGTM
- C (Architecture): LGTM / NOT LGTM
- D (Testability): LGTM / NOT LGTM
- E (Codex-Design): LGTM / NOT LGTM
- F (Codex-Test): LGTM / NOT LGTM
- G (Native): LGTM / NOT LGTM ※ネイティブコード含む場合のみ
- H (Codex-Native): LGTM / NOT LGTM ※ネイティブコード含む場合のみ
```

## レビュー結果の判断

- **Critical指摘は実コードと突き合わせて裏取り必須**: レビュアーはプロジェクトコンテキスト（DB実カラム名、ランタイム環境特性等）を持たないことがある。`tsc`結果や実行結果など客観的証拠で判断する
- **偽陽性と判断したら根拠を示してスキップする**。正しいコードを壊すリスクの方が高い
- Warningでもプロジェクト規約違反（`as`キャスト等）は修正すべきと提案する

## 注意事項

- Codexの `-C` パスはリポジトリルート（`$PROJECT_ROOT`）を使う
- Codexは `-o` を使わず stdout で結果を受け取る
- **計画書レビューと実装レビューは別物**: 計画書のレビュー済み≠実装コードのレビュー済み
