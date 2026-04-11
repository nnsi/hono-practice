---
name: multi-review
description: 従来の multi-review 相当として、Codex sub-agent 4 から 5 体で並列レビューする。修正は行わない。重めの差分や PR 前の全方位レビューで使う。
---

# マルチレビュー

Codex 版では `codex-multi-review` と同じ reviewer 構成を使う。修正は行わない。

## 実行方針

1. `.codex/skills/codex-multi-review/SKILL.md` の reviewer 構成と集約ルールをそのまま使う。
2. prompt は `.codex/skills/codex-multi-review/prompts/` 配下を読む。
3. `spawn_agent` で reviewer を同時起動し、全結果が揃ってから集約する。
4. Native reviewer は `.swift` / `.kt` が含まれる時だけ起動する。

## 位置づけ

- `cross-review`: 軽量 2 reviewer
- `multi-review`: 重量 4 から 5 reviewer
- `review-cycle`: レビューと修正の反復

この skill 名で呼ばれた場合も、実際の手順は `codex-multi-review` と同じにする。
