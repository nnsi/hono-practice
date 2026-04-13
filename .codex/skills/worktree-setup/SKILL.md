---
name: worktree-setup
description: Git worktree と専用 DB、env、依存インストール、migrate、seed をまとめてセットアップする。並列開発や隔離検証環境を作る時に使う。
---

# Worktree Setup

`.worktrees/<name>` に隔離環境を作る。

この skill を使った後は、以降の実装・テスト・ブラウザ確認を worktree 側で行う。setup が終わる前に通常 workspace で編集や検証を始めてはいけない。

## 手順

1. worktree 名を決める。
- 短く、目的が分かる名前にする

2. Docker の DB コンテナが起動しているか確認する。

```bash
docker compose ps --status running
```

- PowerShell セッションでも script 呼び出しは `bash` 経由に固定する

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

5. 以降の作業場所を切り替える。
- shell の `workdir` を worktree パスへ切り替える
- 以降の `apply_patch`、テスト、dev server、ブラウザ確認は worktree を基準に行う

## 成功条件

- worktree パスを明示できる
- 使用ブランチを明示できる
- DB 名、API ポート、Vite ポートを明示できる
- 続くコマンドが worktree 配下を `workdir` にしている

## 注意事項

- このスクリプトは `apps/backend/.env.example` を元に `apps/backend/.env` を作成し、`apps/frontend/.env`、`apps/admin-frontend/.env`、`apps/mobile/.env` を worktree 用に整える
- 依存インストールと migrate まで自動で行う
- Windows / PowerShell 環境でも `./scripts/worktree-setup.sh` を直接叩かず、必ず `bash ./scripts/worktree-setup.sh ...` で実行する
- worktree 用の接続先を確認せずにブラウザ確認へ進まない
- setup に失敗したら、通常 workspace に切り替えて続行しない
- Docker や script が利用できず setup できない場合は、その失敗を共有して止まる
