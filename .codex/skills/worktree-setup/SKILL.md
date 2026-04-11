---
name: worktree-setup
description: Git worktree と専用 DB、env、依存インストール、migrate、seed をまとめてセットアップする。並列開発や隔離検証環境を作る時に使う。
---

# Worktree Setup

`.worktrees/<name>` に隔離環境を作る。

## 手順

1. worktree 名を決める。
- 短く、目的が分かる名前にする

2. Docker の DB コンテナが起動しているか確認する。

```bash
docker compose ps --status running
```

3. bash スクリプトを実行する。
- default では seed あり
- seed を外す時だけ `--no-seed`

```bash
bash ./scripts/worktree-setup.sh <name> [port-offset] [--no-seed]
```

4. 出力から以下を控える。
- worktree パス
- DB 名
- API ポート
- Vite ポート

## 注意事項

- このスクリプトは `apps/backend/.env.local`、`apps/frontend/.env`、`apps/admin-frontend/.env`、`apps/mobile/.env` を worktree 用に整える
- 依存インストールと migrate まで自動で行う
- worktree 用の接続先を確認せずにブラウザ確認へ進まない
