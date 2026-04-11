---
name: playwright-cli
description: "`playwright-cli` を shell から使ってブラウザ操作、動作確認、スクリーンショット、ネットワーク確認、デバッグを行う。ブラウザ手動確認や UI デバッグで使う。"
---

# Playwright CLI

`playwright-cli` を shell から直接叩いてブラウザを操作する。

## 基本ワークフロー

1. ポートを読む。
- frontend は `apps/frontend/vite.config.ts`
- backend は `apps/backend/.env`

2. ブラウザを開く。

```bash
playwright-cli open http://localhost:<port>
```

3. 要素参照を取る。

```bash
playwright-cli snapshot
```

4. 操作する。

```bash
playwright-cli click e3
playwright-cli fill e1 "test"
playwright-cli press Enter
```

5. 結果を確認する。

```bash
playwright-cli snapshot
playwright-cli screenshot
playwright-cli console error
playwright-cli network
```

6. 終了する。

```bash
playwright-cli close
```

## よく使うコマンド

- `open <url>`: ブラウザを開く
- `snapshot`: 要素参照を取得する
- `click <ref>` / `fill <ref> <text>` / `press <key>`: UI 操作
- `console [level]`: コンソール確認
- `network`: ネットワーク確認
- `screenshot`: スクリーンショット保存
- `route` / `unroute`: API モック
- `state-save` / `state-load`: 認証状態保存
- `tab-new` / `tab-list` / `tab-select`: タブ操作
- `eval` / `run-code`: JS 実行

## 注意事項

- 画面遷移や DOM 変化の後は、要素参照が変わるので `snapshot` を取り直す
- 長い確認作業では `playwright-cli list` でセッションを確認する
- 複数セッションを回す場合は `-s <name>` を付ける
- UI 回帰確認の標準フローは `.codex/skills/browser-check/SKILL.md` にまとめる
