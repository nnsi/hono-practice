---
description: 日付・同期ロジックの境界値と不変条件のテスト。
globs:
  - "packages/domain/**"
  - "packages/sync-engine/**"
---

# 日付・同期のテスト

時刻境界・集計・同期を変更するときは、月末・うるう年・timezone 境界などの例示と、不変条件を確認する。入力の組み合わせが多い不変条件には既存の `@fast-check/vitest` property test を追加・更新する。単純な変更は通常の unit test でよい。

- 参照: `packages/domain/test/_property/`、`packages/sync-engine/test/_property/`。
- 共通 arbitrary は `packages/domain/test/_property/arbitraries.ts`。失敗 seed の再現手順は同ディレクトリの README.md。
- 日付文字列生成は既存 dateUtils と `scripts/check-date-rules.js` の方針に従う。
