---
name: worktree-setup
description: リポジトリのスクリプトで Git worktree と専用ローカル DB を作る。
---

# Worktree Setup

既存の workspace / worktree をまず確認する。アプリ管理の worktree を使っている場合、このスクリプトで入れ子に作成しない。

このスクリプトはメイン checkout 直下の `.worktrees/<name>` 用。実装を読み、名前は英数字・ハイフン・アンダースコアに限定して既存対象との衝突を確認する。Docker の Postgres 起動を確認してメイン checkout から実行する。

```bash
docker compose ps --status running
bash scripts/worktree-setup.sh <name> [port-offset] [--no-seed]
```

seed は標準で有効。env 作成、依存インストール、migration も実行される。出力と実設定から worktree パス・実ブランチ・DB・API / Vite ポートを確認し、以後はその作業ディレクトリを使う。失敗時は作成済みリソースと残件を報告し、別 DB へ黙って切り替えない。
