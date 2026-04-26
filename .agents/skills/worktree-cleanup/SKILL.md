---
name: worktree-cleanup
description: Git worktreeと専用DBを削除する。並行開発環境の片付け。
user_invocable: true
---

# Worktree Cleanup

不要になった Git worktree を削除し、専用データベースとブランチもクリーンアップする。

## 手順

### 1. 引数からworktree名を取得

`/worktree-cleanup <name>`

- name: 削除対象のworktree名（必須）

### 2. クリーンアップ実行

```bash
./scripts/worktree-cleanup.sh <name>
```

スクリプトが行うこと:
1. DB の既存コネクションを切断 → `DROP DATABASE db_wt_<name>`
2. git worktree を削除（`.worktrees/<name>/`）
3. ブランチ `wt/<name>` を削除

### 3. 結果報告

削除されたリソースを報告する:
- データベース
- worktree ディレクトリ
- ブランチ

## 注意事項

- Postgres コンテナが停止中の場合、DB は削除されない（手動対応方法が表示される）
- worktree 内に未コミットの変更があっても `--force` で削除される
