# mobile 開発ルール

## 環境変数

- **`eas.json` に環境変数の値を書かない**（gitに秘密情報を載せないため）
- 環境変数は `eas env:create` でEASサーバー側に登録する
- アプリ内では `process.env.EXPO_PUBLIC_*` で参照（`EXPO_PUBLIC_` プレフィックスによりMetroが自動インライン化）
- `app.config.ts` の `extra` + `expo-constants` パターンは不要
