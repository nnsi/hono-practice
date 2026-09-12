---
name: playwright-cli
description: playwright-cli でブラウザ操作・スクリーンショット・通信調査を行う。
---

# Playwright CLI

`playwright-cli --help` でインストール済み CLI の操作を確認する。未導入なら、利用可能なブラウザツールを使うか導入が作業範囲に含まれるか判断する。

```bash
playwright-cli open http://localhost:<port>
playwright-cli snapshot
playwright-cli click <ref>
playwright-cli fill <ref> "test"
playwright-cli snapshot
playwright-cli screenshot
playwright-cli console error
playwright-cli network
```

- 操作対象は snapshot の実際の参照を使い、遷移や DOM 更新後は取り直す。
- 同時作業では CLI のセッション指定を使う。終了時は作成したセッションだけを閉じる。
- モック・認証状態保存・viewport 変更は該当コマンドの help を読む。認証状態をリポジトリへ保存しない。
- 検証観点は [browser-check](../browser-check/SKILL.md) に従う。
