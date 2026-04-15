---
name: ota-update
description: モバイルアプリの JS バンドルを EAS Update で配信する。ネイティブ変更を含まない変更を preview などのチャンネルへ配信する時に使う。
---

# OTA Update

JS / TS のみの変更を EAS Update で配信する。ネイティブ変更は含めない。

## 参照先

- 詳細手順: `docs/ops/mobile-ota.md`
- app config: `apps/mobile/app.config.ts`

## 手順

1. 配信メッセージを決める。
- ユーザー指定があればそれを使う
- なければ直近 diff から 1 行で要約する

2. OTA 対象かどうかを先に判定する。
- `apps/mobile/package.json`、`apps/mobile/app.config.ts`、`apps/mobile/eas.json`、config plugin、`ios/`、`android/` に変更がある場合は OTA 対象として扱わない
- 新規依存が native module を含みうる場合も OTA 対象として扱わない
- OTA 対象でない場合は `EAS Build` 側の手順へ切り替える

3. `.env` を export した状態で `eas env:list` を実行し、配信環境の `EXPO_PUBLIC_*` を確認する。

```bash
bash -lc "cd apps/mobile && set -a && source .env && set +a && eas env:list --environment preview"
```

4. `docs/ops/mobile-ota.md` に従って `EXPO_PUBLIC_*` を付けたまま Android と iOS を個別に配信する。
- Android は `--clear-cache` を付ける
- `--platform all` は使わない

5. Update ID と Dashboard URL を報告する。

## 注意事項

- ローカルからの `eas update` は EAS サーバーの env を自動注入しない
- `.env` の export と `EXPO_PUBLIC_*` の付与を両方行う
- `EXPO_PUBLIC_API_URL is not set` を作るとアプリを壊す
- native 変更の可能性があるなら OTA で押し切らない
- 反映不良や `updatePreviouslyFailed` の確認方法は `docs/ops/mobile-ota.md` を読む
