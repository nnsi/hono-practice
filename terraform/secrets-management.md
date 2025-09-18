# シークレット管理方法

Terraformでシークレットを安全に管理するための複数の方法を提供します。

## 方法1: 環境変数を使用（推奨）

### 設定方法

1. 環境変数を設定
```bash
# Linux/Mac
export TF_VAR_cloudflare_api_token="your-token"
export TF_VAR_jwt_secret="your-jwt-secret"
export TF_VAR_database_url="postgresql://..."

# Windows (PowerShell)
$env:TF_VAR_cloudflare_api_token = "your-token"
$env:TF_VAR_jwt_secret = "your-jwt-secret"
$env:TF_VAR_database_url = "postgresql://..."
```

2. variables.tfで変数定義（デフォルト値なし）
```hcl
variable "jwt_secret" {
  description = "JWT Secret"
  type        = string
  sensitive   = true
  # デフォルト値を設定しない
}
```

3. terraform apply実行
```bash
terraform apply
```

### .envファイルを使用する場合
```bash
# .env.secretsファイルを作成（.gitignoreに追加）
cat > .env.secrets <<EOF
export TF_VAR_cloudflare_api_token="your-token"
export TF_VAR_jwt_secret="your-jwt-secret"
export TF_VAR_database_url="postgresql://..."
EOF

# 環境変数を読み込んで実行
source .env.secrets && terraform apply
```

## 方法2: terraform.tfvarsをローカルのみで管理

### 設定方法

1. terraform.tfvarsは既に.gitignoreに追加済み
2. ローカルでterraform.tfvarsを作成
3. チームメンバーには別途安全な方法で共有

```bash
# terraform.tfvarsをコピー
cp terraform.tfvars.example terraform.tfvars

# 実際の値を設定
vim terraform.tfvars

# 適用
terraform apply
```

## 方法3: 外部データソースを使用

### AWS Secrets Manager
```hcl
data "aws_secretsmanager_secret_version" "db" {
  secret_id = "rds/production/password"
}

locals {
  db_password = jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)["password"]
}
```

### 環境変数から読み込む
```hcl
data "external" "secrets" {
  program = ["bash", "-c", "echo '{\"jwt_secret\":\"'$JWT_SECRET'\", \"db_password\":\"'$DB_PASSWORD'\"}'"]
}

locals {
  jwt_secret = data.external.secrets.result.jwt_secret
  db_password = data.external.secrets.result.db_password
}
```

## 方法4: Terraform Cloud/Enterprise

### 設定方法

1. Terraform Cloudでワークスペースを作成
2. Environment VariablesでSensitiveとして設定
3. ローカルからremote backendを使用

```hcl
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      name = "actiko-production"
    }
  }
}
```

## 方法5: GitHub Actions + Secrets

### .github/workflows/terraform.yml
```yaml
name: Terraform Apply

on:
  push:
    branches: [main]
    paths:
      - 'terraform/**'

jobs:
  terraform:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform

      - name: Terraform Apply
        env:
          TF_VAR_cloudflare_api_token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          TF_VAR_jwt_secret: ${{ secrets.JWT_SECRET }}
          TF_VAR_database_url: ${{ secrets.DATABASE_URL }}
          TF_VAR_encryption_key: ${{ secrets.ENCRYPTION_KEY }}
        run: terraform apply -auto-approve
        working-directory: ./terraform
```

## 方法6: HashiCorp Vault

### Vault Provider使用
```hcl
provider "vault" {
  address = "https://vault.example.com"
}

data "vault_generic_secret" "cloudflare" {
  path = "secret/cloudflare"
}

locals {
  cloudflare_api_token = data.vault_generic_secret.cloudflare.data["api_token"]
}
```

## ベストプラクティス

1. **本番環境**: Terraform Cloud または CI/CD + Secrets
2. **開発環境**: 環境変数 または .env.secrets
3. **チーム開発**: Terraform Cloud または Vault

## セキュリティチェックリスト

- [ ] terraform.tfvarsは.gitignoreに追加
- [ ] tfstateファイルは暗号化されたバックエンドに保存
- [ ] sensitiveフラグを使用
- [ ] アクセス権限は最小限に
- [ ] 定期的にシークレットをローテーション