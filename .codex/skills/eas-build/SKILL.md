---
name: eas-build
description: モバイルアプリのネイティブビルドを EAS Build で実行する。Swift/Kotlin 変更、Widget 変更、ネイティブ依存追加、development build や preview build の作成時に使う。
---

# EAS Build

ネイティブコード変更を含むビルドを EAS Build で実行する。

## 最優先ルール

- `EAS Build` は build credit 消費や従量課金が発生しうる操作として扱う
- ユーザーが `buildして` `preview 向けに作って` と依頼していても、それだけでは課金承認と見なさない
- `eas build` を 1 回でも実行する前に、`eas account:usage` で current cycle の usage を確認する
- `eas build` を 1 回でも実行する前に、profile / platform / usage 状態 / 課金リスクを明示してユーザーの明示確認を取る
- 今月の残クレジットが不明な場合でも安全側に倒し、`追加課金の可能性あり` として確認を取る
- `--non-interactive` `--no-wait` を含む実コマンド実行は、明示確認の後にしか行ってはいけない
- EAS CLI の `100% used` 警告は build 開始後に出ることがあるので、CLI 警告を課金確認の代わりにしてはいけない
- `eas account:usage` に遅延や取得失敗の可能性があるため、usage 確認は必須だが、それだけで安全と見なしてはいけない

## 手順

1. profile と platform を決める。
- profile: `preview` または `development`
- platform: `ios` / `android` / `all`

2. `apps/mobile/.env` を読み込んだ状態で `eas account:usage` を実行する。
- この repo では `.env` を読み込まないと project / account 解決で失敗しやすい
- PowerShell 直実行より、`bash -lc` で `.env` を export してから叩く

```bash
bash -lc "cd apps/mobile && set -a && source .env && set +a && eas account:usage <account-name> --json"
```

- `builds.plan.percentUsed >= 100` の時点で、build は追加課金状態として扱う
- usage が取得できない時点でも、build は追加課金リスクありとして扱う

3. 実行前にユーザーへ確認する。
- 伝える内容は `profile` `platform` `usage 状態` `追加課金の可能性` の 4 点を最低限含める
- ユーザーの明示承認があるまで、build コマンドは実行しない

4. `apps/mobile/.env` を読み込んだ状態で `eas build` を実行する。
- この repo では `app.config.ts` が `BUNDLE_ID`、`EAS_PROJECT_ID`、`EAS_OWNER` を `process.env` から読む
- PowerShell 直実行より、`bash -lc` で `.env` を export してから叩く方が安全

```bash
bash -lc "cd apps/mobile && set -a && source .env && set +a && eas build --profile <profile> --platform <platform>"
```

5. shell 実行は長時間になるので、十分長い `timeout_ms` を付ける。

6. 結果から Build ID と Dashboard URL を拾って報告する。

## 使い分け

- `development`: dev client 用
- `preview`: 内部配布や実機確認用
- JS/TS だけの変更なら OTA Update を検討する

## 注意事項

- `.env` の読み込みを飛ばすと `EAS project not configured` で失敗する
- EAS の無料枠と待ち時間が大きいので、ローカルで潰せるエラーは先に潰す
- `eas account:usage` は current cycle の usage 確認に使える
- Expo docs では billing estimate に最大 24 時間の遅延がありうるとされているので、usage が 100% 未満でも課金リスク説明は省略しない
- EAS Build 実行前に、build credit 消費や従量課金の可能性を明示し、必ずユーザーの明示確認を取る
- 課金警告や credit 超過警告が出た場合は、その場で停止し、ユーザー確認なしに続行しない
- ユーザーの承認を得て build を開始した後に課金警告が出た場合は、その警告内容を結果として明示して報告する
- ネイティブ変更がないなら `.codex/skills/ota-update/SKILL.md` を優先する
