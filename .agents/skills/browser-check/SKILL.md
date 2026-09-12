---
name: browser-check
description: UI 変更や回帰調査で、表示・操作・保存結果をブラウザで検証する。
---

# ブラウザ確認

- URL は対象 workspace の env と起動設定から確認する。Web は `apps/frontend/.env` と `vite.config.ts`、API は `apps/backend/.env`。既存サーバーを再利用する。
- 利用可能なブラウザ操作ツールを使う。CLI を使う場合は [playwright-cli](../playwright-cli/SKILL.md) を読む。
- 変更に関係する操作を最後まで実行し、保存・再表示の結果を確かめる。クリック不発を別操作で回避して成功扱いしない。
- 空状態と既存データ、エラー・オフライン状態は変更に関係するものを選ぶ。UI レイアウトは狭い幅（目安 375px）も確認する。
- Console / Network と画面を照合する。Expo Web での確認と native 実機での確認を区別する。
- テスト用データを使い、対象 URL・操作・結果・未確認範囲を報告する。
