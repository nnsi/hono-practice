# 認証フロー

## 概要

本アプリケーションでは、JWT形式のアクセストークンとリフレッシュトークンを組み合わせた認証方式を採用しています。

### トークンの仕様

- アクセストークン
  - 形式: JWT
  - 有効期限: 15分
  - 保存場所: ローカルストレージ
  - 用途: APIリクエスト時の認証

- リフレッシュトークン
  - 形式: ランダム文字列
  - 有効期限: 1ヶ月
  - 保存場所: ローカルストレージ
  - 用途: アクセストークンの更新

## 認証フロー詳細

### 1. ログイン

1. ユーザーがログイン情報を入力
2. バックエンドに認証リクエストを送信
3. 認証成功時、以下のトークンを受け取る
   - アクセストークン
   - リフレッシュトークン
4. 受け取ったトークンをローカルストレージに保存
5. アクセストークンをAPIクライアントのデフォルトヘッダーに設定

### 2. APIリクエスト時の認証処理

1. APIリクエスト時にアクセストークンをヘッダーに付与
2. バックエンドでトークンの検証
3. 検証結果に応じて以下の処理を実行
   - 成功: リクエストを処理
   - 失敗（401）: リフレッシュトークンによる更新処理を開始

### 3. アクセストークン更新処理

1. 401エラー発生時、リフレッシュトークンを使用して更新リクエストを送信
2. 更新成功時
   - 新しいアクセストークンを受け取り、ローカルストレージに保存
   - 元のAPIリクエストを再試行
3. 更新失敗時
   - ログアウト処理を実行
   - ログイン画面にリダイレクト

### 4. ログアウト

1. バックエンドにログアウトリクエストを送信
2. リフレッシュトークンを無効化
3. ローカルストレージからトークンを削除
4. ログイン画面にリダイレクト

## エラーハンドリング

### 1. アクセストークン期限切れ

- 自動的にリフレッシュトークンを使用して更新を試みる
- 更新成功時はユーザーに影響を与えない
- 更新失敗時はログアウト処理を実行

### 2. リフレッシュトークン期限切れ

- ログアウト処理を実行
- ログイン画面にリダイレクト
- ユーザーに再ログインを促す

### 3. その他の認証エラー

- エラーメッセージをユーザーに表示
- 必要に応じてログアウト処理を実行

## セキュリティ対策

1. トークンの保存
   - ローカルストレージを使用
   - トークンは暗号化せずに保存（XSS対策は別途実装）

2. APIリクエスト
   - すべてのAPIリクエストにHTTPSを使用
   - アクセストークンはAuthorizationヘッダーで送信

3. トークンの無効化
   - ログアウト時に確実にトークンを無効化
   - 期限切れトークンは自動的に無効化

## 実装上の注意点

1. トークン更新処理
   - 複数のAPIリクエストが同時に失敗した場合の競合を考慮
   - 更新処理中は他のAPIリクエストを待機させる

2. エラーハンドリング
   - ユーザーに適切なフィードバックを提供
   - エラー状態からの回復処理を確実に実装

3. セッション管理
   - トークンの有効期限を定期的にチェック
   - 不要なトークンは確実に削除
