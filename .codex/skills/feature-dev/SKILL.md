---
name: feature-dev
description: ヒアリング、探索、設計、実装、検証、ブラウザ確認、レビュー、完了報告までを一気通貫で進める開発ワークフロー。中規模以上の機能追加や改修で使う。
---

# 機能開発ワークフロー

Phase を切って進める。進捗管理は `update_plan` を使う。

## Phase

1. Discovery
2. Codebase Exploration
3. Clarifying Questions
4. Architecture Design
5. Worktree Setup
6. Implementation + Verification
7. Browser Check 1
8. Review Cycle
9. Browser Check 2
10. Completion Report
11. Commit / Push / PR
12. Diary
13. Cleanup

## 実行ルール

### 1. Discovery

- ゴール、影響範囲、規模を整理する
- 曖昧さがある場合だけ質問する
- Phase 3 と Phase 4 で判断が要る仕様差分は、この段階で候補として控える
- UI 方式の差分（例: ドラッグ&ドロップか、ボタン操作か）のように実装体験が変わる点は後回しにしない

### 2. Codebase Exploration

- M/L サイズでは `spawn_agent` で 2 から 3 explorer を並列起動する
- 類似実装、重要ファイル、既存パターンを集める

### 3. Clarifying Questions

- Discovery と Exploration の結果を突き合わせ、曖昧な点を列挙する
- エッジケース、エラーハンドリング、既存機能との統合点、後方互換性、パフォーマンス要件を確認する
- `Web でやることは Mobile でもやる必要があるか` を必ず自問する
- ユーザー判断が必要な点はまとめて提示し、回答を得てから Phase 4 に進む
- ユーザーが `任せる` `確認不要` などの意図を示した場合は、自分の判断を明示してから進む
- 仕様書の文言と実装体験がズレる可能性がある点は、技術的に実装可能でも確認対象に含める

### 4. Architecture Design

- 最小変更案と保守性重視案を比較する
- 各案について、変更ファイル、トレードオフ、並列実装単位、ブラウザ確認フローを整理する
- おすすめ案と理由を示し、ユーザーが未承認なら選択を求める
- ユーザーが事前に `承認不要` `おすすめで進めてよい` と明示している場合だけ、おすすめ案で進める

### 5. Worktree Setup

- `feature-dev` では原則として `.codex/skills/worktree-setup/SKILL.md` を使って worktree を作る
- 既存 worktree のパスやブランチがユーザーから指定されている場合はそれを使う
- ユーザーが明示的に `worktree 不要` `main で作業` などと指示した場合だけ skip する
- worktree パス、ポート、DB 名を plan に残す

### 6. Implementation + Verification

- 実装は worker に委譲してよいが、ファイル責務を分離する
- 新規ルートを足すフロントエンド変更では dev server を先に起動する
- 検証は自分で `pnpm run test-once`、`pnpm run tsc`、`pnpm run fix` を回す
- 新しい分岐やパラメータが本当に効くテストを追加する

### 7. Browser Check 1

- `.codex/skills/browser-check/SKILL.md` を使う
- UI 変更では 375px 幅も確認する
- React Native Web で見られる範囲は `apps/mobile` も確認する

### 8. Review Cycle

- `.codex/skills/review-cycle/SKILL.md` を使う
- 修正後は毎回テストを回す

### 9. Browser Check 2

- レビュー修正で壊していないことを再確認する

### 10. Completion Report

- 実装内容、検証結果、ブラウザ確認結果、worktree 情報を報告する

### 11. Commit / Push / PR

- コミット、push、PR はユーザーが求めた時だけ行う

### 12. Diary

- 日記を書く場合はメインリポジトリで `.codex/skills/write-diary/SKILL.md` を使う
- worktree 側には書かない

### 13. Cleanup

- worktree を作った場合は `.codex/skills/worktree-cleanup/SKILL.md` を使う
- 開発サーバーはポート指定で止める

## 注意事項

- Phase を飛ばさず、`update_plan` を更新し続ける
- 各 Phase 完了時に、何を確認し何を判断したかを短くユーザーへ共有してから次に進む
- 実装完了報告を鵜呑みにせず、自分で検証する
- ブラウザ確認とレビューを通す前に完了扱いしない
