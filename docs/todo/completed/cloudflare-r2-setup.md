# Cloudflare R2 セットアップガイド

このドキュメントでは、ActikoアプリケーションでCloudflare R2を使用して画像アップロードを有効にする方法を説明します。

## 前提条件

- Cloudflareアカウント
- Cloudflare R2が有効になっていること
- Wranglerがインストールされていること

## セットアップ手順

### 1. R2バケットの作成

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログイン
2. 左メニューから「R2」を選択
3. 「Create bucket」をクリック
4. バケット名を入力：
   - 本番環境: `actiko-uploads`
   - ステージング環境: `actiko-uploads-stg`
5. リージョンは「Automatic」を選択（推奨）

### 2. 公開アクセスの設定

各バケットで以下の設定を行います：

1. 作成したバケットをクリック
2. 「Settings」タブを開く
3. 「Public Access」セクションで「Allow public access」を有効化
4. 表示される公開URLをコピー（例：`https://pub-xxxxx.r2.dev`）

### 3. wrangler.tomlの更新

`wrangler.toml`ファイルを以下のように更新します：

```toml
# R2バケットのバインディング
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "actiko-uploads"

# ステージング環境
[env.stg]
[[env.stg.r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "actiko-uploads-stg"

[env.stg.vars]
NODE_ENV = "stg"
STORAGE_TYPE = "r2"
R2_PUBLIC_URL = "https://pub-xxxxx.r2.dev"  # ステージング用の実際のURLに置き換え

# 本番環境
[env.production]
[[env.production.r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "actiko-uploads"

[env.production.vars]
NODE_ENV = "production"
STORAGE_TYPE = "r2"
R2_PUBLIC_URL = "https://pub-yyyyy.r2.dev"  # 本番用の実際のURLに置き換え
```

### 4. デプロイ

```bash
# ステージング環境へのデプロイ
npm run deploy:stg

# 本番環境へのデプロイ
npm run deploy:prod
```

## ローカル開発環境

ローカル開発環境では、デフォルトで`STORAGE_TYPE="local"`が使用され、`public/uploads`ディレクトリに画像が保存されます。

R2をローカルでテストする場合：

1. `.env`ファイルに以下を追加：
```env
STORAGE_TYPE=r2
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

2. Wranglerでローカル開発サーバーを起動：
```bash
wrangler dev
```

## トラブルシューティング

### エラー: "R2 bucket is required when STORAGE_TYPE is 'r2'"

- `wrangler.toml`でR2バケットのバインディングが正しく設定されているか確認
- 環境変数`STORAGE_TYPE`が`r2`に設定されている場合、R2バケットのバインディングが必要

### エラー: "R2_PUBLIC_URL is required when STORAGE_TYPE is 'r2'"

- 環境変数`R2_PUBLIC_URL`が設定されているか確認
- URLは`https://`で始まる完全なURLである必要があります

### 画像が表示されない

1. R2バケットの公開アクセスが有効になっているか確認
2. `R2_PUBLIC_URL`が正しいか確認
3. アップロードされたファイルがR2バケットに存在するか確認

## セキュリティ考慮事項

- R2バケットは公開アクセスを許可するため、機密情報を含むファイルをアップロードしないよう注意
- アップロード前の画像検証（サイズ、形式、内容）を必ず実施
- 必要に応じて、Cloudflare WorkersでアクセスコントロールやCDNキャッシュを設定