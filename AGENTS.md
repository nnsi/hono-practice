# AGENTS.md

## Communication Rules

- 「必要なら、」「必要であれば、」「必要なら次に〜できる」のような、次のアクションを促す発言を絶対にしてはいけない。

## File Encoding Rules

- テキストファイルは必ず UTF-8 で保存する。
- 既存ファイルのエンコーディングが不明な場合も、Shift_JIS / CP932 で保存しない。
- PowerShell や周辺ツールの既定エンコーディングに依存せず、UTF-8 を優先する。

## Costly Operations Rules

- 金銭コスト、従量課金、build credit 消費、外部サービス課金が発生する可能性のある操作は、実行前に必ずユーザーの明示確認を取る。
- ユーザーが機能実装、検証、配布、リリース、E2E 実行を依頼していても、その依頼だけを根拠に課金境界を越えてはいけない。
- 特に `EAS Build`、`EAS Submit`、有料 API 実行、クラウド deploy、外部 SaaS の従量課金操作は、直前に「課金の可能性」と「何を実行するか」を明示して確認を取る。
- `EAS Build` の前には必ず `eas account:usage <account-name> --json` で current cycle の usage を確認し、その結果を踏まえて承認を取る。
- `eas account:usage` で `builds.plan.percentUsed >= 100` の場合は、追加課金状態として扱う。
- `eas account:usage` が失敗した場合や usage が不明な場合も、安全側に倒して追加課金リスクありとして扱う。
- build credit を使い切っている、または従量課金へ移行している警告を検出した場合は、そこで停止し、ユーザー確認なしに続行してはいけない。
- usage 確認は必須だが十分条件ではない。billing estimate に遅延がありうる前提で、usage が 100% 未満でも課金リスク説明を省略してはいけない。
- 課金の有無が不明な場合も、安全側に倒して確認を取る。

## Mobile Native Change Rules

- `apps/mobile/package.json`、`apps/mobile/app.config.ts`、`apps/mobile/eas.json`、`apps/mobile/ios/**`、`apps/mobile/android/**`、config plugin 設定、または新規モバイル依存の導入は、まず `native 変更の可能性あり` として扱う。
- モバイル機能の実装では、依存導入や設計確定の前に、その変更が `OTA で配信可能か`、`iOS / Android の再 build が必要か` を明示的に判定する。
- 上記の判定で native 変更の可能性がある場合は、実装着手前に `導入する依存`, `導入理由`, `OTA 可否`, `再 build 必要有無`, `想定コストや運用影響` をユーザーへ明示し、承認を取る。
- ユーザーが `build したくない`, `OTA で済ませたい`, `課金を避けたい` という制約を示している場合、その制約に反する依存や方式を独断で採用してはいけない。
- `react-native-*`、`expo-*`、config plugin 付き package、native module を含みうる package は、JS-only と確認できるまで native 変更候補として扱う。
