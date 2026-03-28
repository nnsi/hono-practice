# Apple Developer Console セットアップ（Sign in with Apple）

> Claude Codeが実装を進める間に、並行してこれらを完了させてください。
> 完了したら各項目の値を共有してください（APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID）。

---

## 1. App ID の設定

- [x] [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → Identifiers
- [x] Actikoの App ID を選択（なければ新規作成）
- [x] Capabilities タブで **Sign in with Apple** を有効化
- [x] Save

## 2. Services ID の作成（Web用 client_id）

- [x] Identifiers → 右上「+」 → **Services IDs** を選択
- [x] Description: `Actiko Web`（任意）
- [x] Identifier: `com.actiko.web`（任意、これが `APPLE_CLIENT_ID` になる）
- [x] Register → 作成した Services ID を開く
- [x] **Sign in with Apple** にチェック → Configure
- [x] Primary App ID: 手順1の App ID を選択
- [x] Domains and Subdomains: 本番ドメインを入力（例: `actiko.example.com`）
- [x] Return URLs: `https://<本番ドメイン>/auth/apple/callback` を追加
  - 開発用も必要なら `http://localhost:2460` 系も追加（※ AppleはHTTPSのみ許可のため、開発時はngrok等のトンネルが必要）
- [x] Save

## 3. Sign in with Apple Key の作成（.p8 秘密鍵）

- [x] [Keys](https://developer.apple.com/account/resources/authkeys/list) → 右上「+」
- [x] Key Name: `Actiko Sign in with Apple`（任意）
- [x] **Sign in with Apple** にチェック → Configure
- [x] Primary App ID: 手順1の App ID を選択
- [x] Save → Register → **Download**
- [x] ダウンロードした `.p8` ファイルを安全に保管（**再ダウンロード不可**）
- [x] Key ID をメモ（これが `APPLE_KEY_ID` になる）

## 4. Team ID の確認

- [x] [Membership](https://developer.apple.com/account#MembershipDetailsCard) ページで Team ID を確認（これが `APPLE_TEAM_ID`）

## 5. 環境変数の準備

以下の値をClaude Codeに共有してください:

| 環境変数 | 取得元 | 値 |
|---|---|---|
| `APPLE_TEAM_ID` | 手順4 | |
| `APPLE_KEY_ID` | 手順3 | |
| `APPLE_CLIENT_ID` | 手順2の Identifier | |
| `APPLE_PRIVATE_KEY` | `.p8`ファイルの中身をbase64エンコード | |

### .p8 → base64 変換コマンド

```bash
# ヘッダー/フッター除去してbase64化
grep -v -- '-----' AuthKey_XXXXXXXXXX.p8 | tr -d '\n'
```

※ あるいは `-----BEGIN PRIVATE KEY-----` 含むままbase64にして、サーバー側でデコード後にパースしてもOK（実装側で対応します）

## 6. Expo (モバイル) 側の設定

- [x] `app.json` / `app.config.ts` の `ios.bundleIdentifier` が App ID の Bundle ID と一致していることを確認
- [x] Apple Developer Console → App ID → Sign in with Apple が **Enabled** になっていることを再確認

## 7. 注意事項

- `.p8` ファイルは **1度しかダウンロードできない**。紛失したら再作成が必要
- Services ID の Return URLs は **HTTPS 必須**（localhost不可）
- Apple Sign-In はメールを非公開にできる（Private Email Relay）。ユーザーのメールが `xxxxx@privaterelay.appleid.com` になる場合がある
- テスト時は実際のApple IDが必要（Googleのようなテストアカウントはない）
