# Google認証の実装タスク

- [x] **Google APIの設定**:
  - [x] Google Cloud Consoleでプロジェクトを作成し、OAuth 2.0クライアントIDを取得します。

- [x] **環境変数の設定**:
  - [x] `.env`ファイルにGoogleのクライアントIDやクライアントシークレットを追加します。

- [x] **データベースのスキーマ作成**:
  - [x] user_providersテーブルの作成

- [x] **バックエンドの設定**:
  - [x] google-auth-libraryのインストール
  - [x] authRoute.tsに`/auth/google`のルーティングを追加
  - [x] authHandler.tsに`googleLogin`ハンドラを追加
  - [x] authUsecase.tsに`loginWithProvider`メソッドを追加
    - [x] 検証に成功したら、`user_providers`テーブルにユーザー情報を保存
    - [x] 必要に応じて`users`テーブルにユーザー情報を作成
    - [x] 既存の認証フローのトークンを発行してクライアントに返す

- [ ] **バックエンドのテスト**:
  - [ ] authUsecase.ts / `loginWithProvider` のユニットテストを追加
  - [ ] authRoute.test.ts / `/auth/google` の統合テストを追加

- [ ] **フロントエンドの設定**:
  - [ ] @react-oauth/googleのインストール
  - [ ] ログインフォームやユーザーインターフェースにGoogle認証ボタンを追加
  - [ ] GoogleのOAuth 2.0フローを処理するためのロジックを実装
  - [ ] Google認証のステータスを表示するUIコンポーネントを作成
  - [ ] 認証後のユーザー情報を表示するためのページを作成
