---
name: eas-build
description: モバイルアプリのネイティブビルドを EAS Build で実行する。Swift/Kotlin 変更、Widget 変更、ネイティブ依存追加、development build や preview build の作成時に使う。
---

# EAS Build

ネイティブコード変更を含むビルドを EAS Build で実行する。

## 手順

1. profile と platform を決める。
- profile: `preview` または `development`
- platform: `ios` / `android` / `all`

2. `apps/mobile/.env` を読み込んだ状態で `eas build` を実行する。
- この repo では `app.config.ts` が `BUNDLE_ID`、`EAS_PROJECT_ID`、`EAS_OWNER` を `process.env` から読む
- PowerShell 直実行より、`bash -lc` で `.env` を export してから叩く方が安全

```bash
bash -lc "cd apps/mobile && set -a && source .env && set +a && eas build --profile <profile> --platform <platform>"
```

3. shell 実行は長時間になるので、十分長い `timeout_ms` を付ける。

4. 結果から Build ID と Dashboard URL を拾って報告する。

## 使い分け

- `development`: dev client 用
- `preview`: 内部配布や実機確認用
- JS/TS だけの変更なら OTA Update を検討する

## 注意事項

- `.env` の読み込みを飛ばすと `EAS project not configured` で失敗する
- EAS の無料枠と待ち時間が大きいので、ローカルで潰せるエラーは先に潰す
- ネイティブ変更がないなら `.codex/skills/ota-update/SKILL.md` を優先する
