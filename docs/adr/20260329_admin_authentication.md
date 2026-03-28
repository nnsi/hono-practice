# 管理者認証（Google OAuth + メールアドレスホワイトリスト）

## ステータス: Accepted

## コンテキスト

管理画面へのアクセスを特定の管理者に限定する認証方式が必要。
既存のユーザー認証（JWT + リフレッシュトークン）とは別の管理者専用認証フローを設計する。

## 決定事項

### 1. 認証方式: Google OAuth + メールアドレスホワイトリスト

- Google Sign-In で認証
- IDトークンからメールアドレスを取得
- 環境変数 `ADMIN_ALLOWED_EMAILS` に登録されたメールアドレスと一致する場合のみアクセス許可
- 一致しない場合は403エラー

### 2. ADMIN_ALLOWED_EMAILS

- カンマ区切りで複数メール対応: `"admin1@example.com,admin2@example.com"`
- GitHub Varsの `VITE_CONTACT_EMAIL` と同じメールアドレスを設定する運用想定
- backend の env.local に `ADMIN_ALLOWED_EMAILS` を追加

### 3. トークン管理

- 管理者用にもJWTを発行（既存のJWT基盤を再利用）
- JWTペイロードに `role: "admin"` を含める
- adminAuthMiddlewareで `role` をチェック
- リフレッシュトークンは発行しない（セッション有効期限: 8時間）
  - 管理画面は長時間放置する想定がない
  - シンプルさを優先

### 4. 既存ユーザーテーブルとの関係

- 管理者は既存の `users` テーブルとは独立
- 管理者ユーザーをDBに保存しない（環境変数で管理）
- 理由: 管理者は1-2名想定。DBスキーマの変更を避ける

## 却下した案

### A. 既存ユーザーにadminロールを追加
- usersテーブルにroleカラム追加 → マイグレーション必要、既存APIへの影響大

### B. 別テーブルで管理者管理
- 管理画面のMVPとしてはオーバー。将来必要になったら移行可能

## セキュリティ考慮

- Google IDトークンの検証はバックエンドで実施（フロントエンドを信頼しない）
- メールアドレスの `email_verified` フラグを確認
- admin APIは全てadminAuthMiddlewareで保護
