# Google OAuth: プラットフォーム別認証方式

## ステータス

決定

## コンテキスト

モバイルアプリ（Expo/React Native）にGoogle OAuth認証を追加した際、iOS/Androidで異なる制約に直面した。

### 元々の構成

- OAuthクライアント: Google ConsoleのWeb Application型 1つ
- フロー: `expo-auth-session`の`useAuthRequest`で`responseType: IdToken`（implicit flow）
- Web/iOS/Android共通のclientId

### 発生した問題

1. **Googleポリシー違反エラー**: 「This app doesn't comply with Google's OAuth 2.0 policy for keeping apps secure」
   - 原因: Web Application型クライアントでカスタムURIスキーム（`actiko://`）のリダイレクトが2022年以降ブロックされている

2. **プラットフォーム別の制約の非対称性**:

| クライアント型 | カスタムスキーム | ブラウザフロー | client_secret |
|---|---|---|---|
| Web Application | NG | OK | 必須 |
| iOS | OK | OK | 不要 |
| Android | - | NG（ネイティブSDK専用） | 不要 |

iOS型クライアントはブラウザフロー＋カスタムスキームを許可するが、Android型クライアントはネイティブSDK専用でブラウザフローに対応しない。Web型クライアントはブラウザフローOKだがカスタムスキームのリダイレクトを拒否する。

### 検討した選択肢

| 方式 | 概要 | メリット | デメリット |
|---|---|---|---|
| A. `expo-auth-session/providers/google` + バックエンドリレー | iOS=iOS型clientId、Android=Web型clientId＋バックエンドリダイレクト中継 | RN Web互換維持、ネイティブ依存なし | Android用にバックエンドエンドポイントが必要 |
| B. `@react-native-google-signin/google-signin` | ネイティブSDK、Google推奨 | 安定、公式推奨 | RN Web非対応、ネイティブ依存 |
| C. Expo auth proxy | Expoのプロキシサーバー経由 | コード変更最小 | 非推奨、廃止リスク |

方式Bは**React Native Webが動作しなくなる**ため却下。React Native WebはClaude Codeが実装確認する際の主要手段であり、開発効率への影響が大きい。

## 決定事項

**方式A: プラットフォーム別clientId + Android用バックエンドリレー**を採用。

### Web（フロントエンド）
- Google Identity Services（GIS）を使用（従来通り）
- Web Application型clientId

### iOS
- `expo-auth-session/providers/google`
- iOS型clientId（`iosClientId`）
- expo-auth-sessionの標準フロー（PKCE + auto code exchange）

### Android
- `expo-auth-session/providers/google`
- Web Application型clientId（`androidClientId`にweb clientIdを指定）
- リダイレクトURIをHTTPS（`https://api.actiko.app/auth/google/callback`）に設定
- バックエンドが`actiko://oauthredirect`にリレーリダイレクト
- `app/oauthredirect.tsx`ルートでコード受け取り → `POST /auth/google/exchange`でサーバーサイドのコード交換（client_secret付き）

### バックエンド
- `GET /auth/google/callback`: Googleからのリダイレクトを`actiko://oauthredirect`に中継
- `POST /auth/google/exchange`: authorization codeをclient_secret付きでトークン交換 → id_token検証 → ログイン処理
- `audience`検証を`string | string[]`対応に変更（Web/iOS/Android各clientIdのトークンを受け付ける）

### Google Consoleのクライアント構成

| 型 | 用途 |
|---|---|
| Web Application | Web frontend + Android（ブラウザフロー用） |
| iOS | iOS（bundle ID: `com.actiko.app`） |
| Android | Google Consoleでの存在登録用（コードからは直接使わない） |

### 環境変数

| 変数 | 用途 |
|---|---|
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Web clientId（Android兼用） |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` | iOS clientId |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` | Android clientId（現在はweb clientIdと同値だが分離して管理） |
| `GOOGLE_OAUTH_CLIENT_SECRET` | バックエンド用。Androidのコード交換に必要 |

## 結果

- iOS/Android両方でGoogle OAuth認証が動作
- React Native Webの互換性を維持
- バックエンドに2エンドポイント追加（`/auth/google/callback`, `/auth/google/exchange`）
- `_layout.tsx`の認証ガードに`"oauthredirect"`の例外追加が必要

## 備考

### Androidフロー特有の注意点
- `oauthPending`（PKCEのcodeVerifier等）はin-memoryで保持。Androidがメモリ圧迫でアプリプロセスをkillした場合、OAuthフローが失敗する。頻度が問題になればAsyncStorageへの永続化を検討
- SettingsPageのGoogle連携（account linking）はAndroidでは未対応。`oauthredirect`ルートがloginとlinkを区別する仕組みが必要（`oauthPending`に`intent`フィールドを追加する等）

### expo-auth-sessionのAndroid内部実装
`openAuthSessionAsync`はAndroidではpolyfillで動作する（`_authSessionIsNativelySupported()`がfalseを返す）。Chrome Custom TabのcloseをAppState変更で検知し`{ type: 'dismiss' }`を返す。`_waitForRedirectAsync`はURLプレフィックスマッチのため、HTTPSリダイレクトURI → カスタムスキームへの二段階リダイレクトでは発火しない。このため、Android OAuth callbackはexpo-auth-sessionのレスポンスではなく、expo-routerのディープリンクハンドリングで処理する設計とした。
