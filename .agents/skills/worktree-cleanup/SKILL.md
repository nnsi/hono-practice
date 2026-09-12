---
name: worktree-cleanup
description: 不要な Git worktree・専用ローカル DB・関連ブランチを削除する。
---

# Worktree Cleanup

`git worktree list --porcelain` と対象の `git status --short`、未マージ commit を確認し、削除対象を特定する。作業中の checkout 自体から削除を実行しない。未保存の成果を破棄する承認がなければ残す。

`bash scripts/worktree-cleanup.sh <name>` はメイン checkout 直下の `.worktrees/<name>` 専用。DB 接続切断・DB 削除、関連プロセス停止、worktree 強制削除、実ブランチの強制削除を行う。名前を英数字・ハイフン・アンダースコアに限定し、これら全てが削除依頼の範囲か確認してから使う。

スクリプトは `mapfile` を使うため Bash 4 以降が必要。アプリ管理の worktree には流用せず、その環境の削除方法を使う。

完了メッセージだけを信用せず、worktree・ブランチ・DB の残存を確認する。Docker 停止時や DB 削除失敗時は DB が残ることを報告する。
