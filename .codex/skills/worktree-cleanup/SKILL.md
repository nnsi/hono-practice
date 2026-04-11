---
name: worktree-cleanup
description: Git worktree、専用 DB、関連ブランチをクリーンアップする。並列開発環境の片付けで使う。
---

# Worktree Cleanup

不要になった worktree を削除する。

## 手順

1. 対象名を決める。

2. bash スクリプトを実行する。

```bash
bash ./scripts/worktree-cleanup.sh <name>
```

3. 出力で以下を確認する。
- DB 削除
- worktree ディレクトリ削除
- `wt/<name>` ブランチ削除

## 注意事項

- スクリプトは active connection を落としてから DB を削除する
- Docker が止まっていると DB は残る
- worktree 内に未コミット変更があっても削除される
- 先に使用中ポートや dev server を止めておくと事故が少ない
