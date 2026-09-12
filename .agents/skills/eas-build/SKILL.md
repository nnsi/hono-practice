---
name: eas-build
description: EAS native build の準備・実行・結果確認に使う。課金承認は実行前に得る。
---

# EAS Build

ルート AGENTS.md の課金承認条件に従う。先に差分、`apps/mobile/eas.json` の profile / platform / environment とローカルで検出できるエラーを確認する。

この repo の `app.config.ts` は `BUNDLE_ID`、`EAS_PROJECT_ID`、`EAS_OWNER` を環境から読む。リポジトリに入っている CLI を使い、`apps/mobile` で `.env` を export した同じ shell から実行する。

```bash
cd apps/mobile
set -a
source .env
set +a
pnpm exec eas account:usage "$EAS_OWNER" --json
```

profile・platform・usage・課金リスクを提示して明示承認を得た後、同じ環境で `pnpm exec eas build --profile <profile> --platform <platform>` を実行する。環境ごとの変数が登録されているかも確認する。

出力が途切れても再投入しない。Build ID と EAS 側の状態を調べ、完了・失敗・進行中を区別して Dashboard URL とともに報告する。追加課金の警告では続行・再試行を止めて確認する。
