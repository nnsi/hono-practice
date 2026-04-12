---
name: cross-review
description: headless Claude Code (`claude -p`) 1 体と Codex sub-agent 1 体で軽量クロスレビューを行う。修正は行わない。普段使いのレビュー、実装直後の一次確認、review-cycle のデフォルトで使う。
---

# クロスレビュー

headless Claude Code (`claude -p`) と Codex reviewer の 2 体構成で軽量レビューする。修正は行わない。

## レビュアー構成

- A: Logic + Security / headless Claude Code `.codex/skills/cross-review/prompts/logic-security.md`
- B: Architecture + Testability / Codex sub-agent `.codex/skills/cross-review/prompts/codex-review.md`

## 手順

1. 対象ファイルを確定する。
- ユーザー指定があればそれを優先する
- 未指定なら `git diff --name-only HEAD`、0 件なら `git diff --name-only HEAD~1`
- パスの実在は shell か `rg --files` で自分で確認する

2. 各 prompt を読み、`{{TARGET_FILES}}` を実際の一覧に置換する。
- Claude 用 prompt は UTF-8 の一時ファイルに保存する
- diff が長くてもシェル引数長制限に掛からないよう、prompt は標準入力で渡す

3. headless Claude Code と Codex reviewer を同時に起動する。
- Claude 側は `shell_command` で repo root から `claude -p` を起動する
- Codex 側は `spawn_agent` で `explorer` を起動する
- どちらにも修正禁止、confidence 75 以上のみ、LGTM/NOT LGTM 必須を守らせる

4. Claude 側は次の形で起動する。

```powershell
$promptFile = Join-Path $env:TEMP "cross-review-logic-security.txt"
$prompt = Get-Content -Raw -Encoding UTF8 $promptFile
$prompt | claude -p --model opus --permission-mode bypassPermissions
```

5. Codex 側は `codex-review.md` の置換後 prompt をそのまま agent に渡す。

6. 両者の結果が揃ってから集約する。

## 集約ルール

- confidence 80 以上: 修正対象
- confidence 75 から 79 で A/B 両者が同一問題を指摘: 修正対象
- confidence 75 から 79 の単独指摘: 報告のみ

## 注意事項

- Critical は実コードと突き合わせる
- 行番号ずれを前提に、必ず該当ファイルを自分で開いて確認する
- Claude の結果は A、Codex の結果は B として集約する
- 大きな差分やネイティブコード込みなら `.codex/skills/codex-multi-review/SKILL.md` を使う
