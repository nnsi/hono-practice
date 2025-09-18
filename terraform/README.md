# Actiko Cloudflare Infrastructure

TerraformによるCloudflareリソース管理

## セットアップ

1. Cloudflare APIトークンを作成
   - 必要な権限：
     - Account:Cloudflare Workers Scripts:Edit
     - Account:Cloudflare Pages:Edit
     - Account:Cloudflare R2:Edit
     - Zone:Zone:Read
     - Zone:DNS:Edit

2. `terraform.tfvars`を作成
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
   必要な値を設定

3. Terraformを初期化
   ```bash
   terraform init
   ```

## 使用方法

### リソースの確認
```bash
terraform plan
```

### リソースの適用
```bash
terraform apply
```

### リソースの削除
```bash
terraform destroy
```

## 管理リソース

- **Workers**: APIサーバー
- **Pages**: フロントエンド（将来的にWorkersへ移行予定）
- **R2**: オブジェクトストレージ
  - `storage`: メインストレージ
  - `uploads`: アップロード用
  - `backups`: バックアップ（本番環境のみ）

## 環境変数

Worker/Pagesで使用する環境変数は`terraform.tfvars`で設定：
- `worker_environment_variables`: Worker用環境変数
- `worker_secrets`: Worker用シークレット
- `pages_environment_variables`: Pages用環境変数

## 注意事項

- Worker scriptのコンテンツは`lifecycle.ignore_changes`で管理外
- デプロイはCI/CDパイプラインで実行することを推奨
- R2バケットのライフサイクルルール設定済み
  - アップロード: 一時ファイル7日、孤立ファイル30日で削除
  - バックアップ: 90日で削除