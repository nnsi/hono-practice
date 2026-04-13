---
name: worktree-cleanup
description: Git worktree、専用 DB、関連ブランチをクリーンアップする。並列開発環境の片付けで使う。
---

# Worktree Cleanup

不要になった worktree を削除する。

## 手順

1. 対象名を決める。

- PowerShell セッションでも script 呼び出しは `bash` 経由に固定する

2. bash スクリプトを実行する。

```bash
bash ./scripts/worktree-cleanup.sh <name>
```

3. 出力で以下を確認する。
- DB 削除
- worktree ディレクトリ削除
- 対象 worktree で実際に使っていたブランチ削除
- detached HEAD の場合はブランチ削除を skip

## 注意事項

- スクリプトは active connection を落としてから DB を削除する
- Docker が止まっていると DB は残る
- worktree 内に未コミット変更があっても削除される
- ブランチ削除は `wt/<name>` の決め打ちではなく、worktree の実ブランチを読んで行う
- Windows / PowerShell 環境でも `./scripts/worktree-cleanup.sh` を直接叩かず、必ず `bash ./scripts/worktree-cleanup.sh ...` で実行する
- 先に使用中ポートや dev server を止めておくと事故が少ない
