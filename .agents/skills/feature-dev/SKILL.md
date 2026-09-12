---
name: feature-dev
description: Web / Mobile / 共有 package をまたぐ機能追加・改修の影響と完了条件を整理する。
---

# 機能開発

受け入れ条件を満たし、影響する利用箇所の検証と見つかった不具合の修正まで行う。長期作業の引き継ぎが必要な場合は判断と残件を `docs/plan/` に残す。

- API・同期・認証は Web / Mobile の呼び出し元を追う。native 変更と課金はルート AGENTS.md の承認条件に従う。
- UI は翻訳・アクセシビリティ・Mobile のテーマ対応を確認し、[browser-check](../browser-check/SKILL.md) で変更フローを操作する。
- API は `apps/backend/AGENTS.md` の Hono 統合テスト、時刻・同期は `packages/domain/test/_property/` と `packages/sync-engine/test/_property/` の境界値・不変条件を参照する。
- レビュー指摘への対応には [review-cycle](../review-cycle/SKILL.md) を使う。新たな専門レビューは依頼・変更リスクに応じて選ぶ。
