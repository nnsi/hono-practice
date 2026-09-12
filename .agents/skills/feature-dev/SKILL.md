---
name: feature-dev
description: 中規模以上の機能追加・改修で、実装範囲と検証漏れを確認する。
---

# 機能開発

要件・既存実装・受け入れ条件を把握して実装する。段階ごとの承認や定型の設計案比較は不要。長い作業の判断と残件は `docs/plan/` の計画に残す。

- Web / Mobile / 共有 package の影響を確認する。native 変更と課金はルート AGENTS.md の承認条件に従う。
- 現在の workspace を使い、隔離が必要な場合は [worktree-setup](../worktree-setup/SKILL.md) を使う。
- 挙動変更には回帰を検出できるテストを用意する。API は既存 Hono 統合テスト、時刻・同期は境界値と不変条件を確認する。
- UI は翻訳、アクセシビリティ、Mobile のテーマ対応を確認し、[browser-check](../browser-check/SKILL.md) で変更フローを操作する。
- 対象に合う検証と差分レビューを行う。専門レビューが必要な変更・依頼では [review-cycle](../review-cycle/SKILL.md) を使う。修正後は影響する検証を再実行する。
- 結果と未検証範囲を報告する。日記・push・配布・worktree 削除は開発完了の必須工程にせず、依頼された範囲で実行する。
