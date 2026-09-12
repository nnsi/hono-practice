---
description: テスト失敗と既存 CI 状態を切り分ける。
---

# Baseline

比較が必要なときは `.claude/worktree-baseline.json` または `node scripts/check-baseline.js` で対象 commit の CI 状態を確認する。unknown は成功・失敗のどちらでもない。

失敗が変更由来かは、対象 commit・依存・env の比較可能性と実際の出力で判断する。CI の NG だけで既存問題と断定せず、無関係な CI 復旧へ作業範囲を広げない。`git stash` では依存や外部 DB の状態は戻らない。
