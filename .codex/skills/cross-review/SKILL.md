---
name: cross-review
description: Codex sub-agent 2 体で軽量クロスレビューを行う。修正は行わない。普段使いのレビュー、実装直後の一次確認、review-cycle のデフォルトで使う。
---

# クロスレビュー

軽量な 2 reviewer 構成でレビューする。修正は行わない。

## レビュアー構成

- A: Logic + Security `.codex/skills/cross-review/prompts/logic-security.md`
- B: Architecture + Testability `.codex/skills/cross-review/prompts/codex-review.md`

## 手順

1. 対象ファイルを確定する。
- ユーザー指定があればそれを優先する
- 未指定なら `git diff --name-only HEAD`、0 件なら `git diff --name-only HEAD~1`

2. 各 prompt を読み、`{{TARGET_FILES}}` を実際の一覧に置換する。

3. `spawn_agent` で 2 体を同時に起動する。
- `agent_type` は `explorer`
- 修正禁止、confidence 75 以上のみ、LGTM/NOT LGTM を必ず返させる

4. 両者の結果が揃ってから集約する。

## 集約ルール

- confidence 80 以上: 修正対象
- confidence 75 から 79 で A/B 両者が同一問題を指摘: 修正対象
- confidence 75 から 79 の単独指摘: 報告のみ

## 注意事項

- Critical は実コードと突き合わせる
- 行番号ずれを前提に、必ず該当ファイルを自分で開いて確認する
- 大きな差分やネイティブコード込みなら `.codex/skills/codex-multi-review/SKILL.md` を使う
