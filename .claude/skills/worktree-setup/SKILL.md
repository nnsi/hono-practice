---
name: worktree-setup
description: Git worktreeを作成し、専用DBとenv設定をセットアップする。並行開発の初期構築。
user_invocable: true
---

# Worktree Setup

並行開発用の Git worktree を作成し、専用データベース・env設定・依存インストール・マイグレーションまで一括で行う。

## 手順

### 1. 引数からオプションを取得

`/worktree-setup <name> [port-offset] [--seed]`

- name: worktree名（必須）。ブランチ `wt/<name>` が作られる
- port-offset: ポートオフセット（省略時は自動採番）
- --seed: シードデータを投入する場合に指定

### 2. Docker確認

Postgres コンテナが起動していることを確認する。

```bash
docker compose ps --status running
```

起動していない場合はユーザーに `docker compose up -d` を促す。

### 3. セットアップ実行

```bash
./scripts/worktree-setup.sh <name> [port-offset] [--seed]
```

### 4. 結果報告

以下を報告する:
- worktree パス: `.worktrees/<name>`
- データベース名: `db_wt_<name>`
- API ポート: `3456 + offset`
- Vite ポート: `2460 + offset`
- クリーンアップコマンド: `./scripts/worktree-cleanup.sh <name>`

## ポート割り当て

| 環境 | API | Vite |
|------|-----|------|
| メイン | 3456 | 2460 |
| worktree offset=1 | 3457 | 2461 |
| worktree offset=2 | 3458 | 2462 |

## 注意事項

- DB サーバーは共有（同一 Docker Postgres）、データベースのみ分離
- env ファイルはメイン環境からコピー → DB/ポートのみ書き換え
- `pnpm install` と `pnpm db-migrate` はスクリプト内で自動実行される
