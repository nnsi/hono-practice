# 推奨コマンド一覧

## 開発コマンド

### 初期セットアップ
```bash
make setup          # 完全な初期セットアップ（依存関係、環境変数、DB）
make setup-env      # 環境変数のみセットアップ（ポート自動検出）
make setup-db       # DBマイグレーション＋シードデータ投入
```

### 開発サーバー
```bash
npm run dev         # バックエンド開発サーバー (API_PORT: デフォルト3456)
npm run client-dev  # フロントエンド開発サーバー (VITE_PORT: デフォルト5173)
npm run mobile-dev  # モバイル開発サーバー (デフォルト8081)
make dev           # バックエンド＋フロントエンド同時起動
```

### データベース
```bash
npm run db-generate # スキーマ変更後のマイグレーション生成
npm run db-migrate  # マイグレーション適用
npm run db-seed     # テストデータ投入
npm run db-clean    # 全データ削除
make reset-db       # DB完全リセット（削除＋再構築）
```

### テスト・品質管理
```bash
npm run test-once   # テスト実行（CIモード）※推奨
npm run ci-check    # 全CIチェック（テスト＋リンティング）
npm run tsc         # TypeScriptコンパイラチェック
npm run lint        # Biome + ESLintチェック
npm run fix         # コード自動修正
```

### ビルド・デプロイ
```bash
npm run build-client-stg  # ステージング用フロントエンドビルド
npm run build-client      # 本番用フロントエンドビルド
npm run deploy:stg        # ステージングデプロイ
npm run deploy:prod       # 本番デプロイ
```

## Git操作
```bash
git              # メインブランチ: master
git worktree     # 並行開発時のポート変更は環境変数で対応
```

## Docker
```bash
docker-compose up -d    # PostgreSQLコンテナ起動
docker-compose down     # コンテナ停止
docker-compose logs     # ログ確認
```