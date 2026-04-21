# Actiko Cloudflare Infrastructure (Terraform)

Cloudflare リソースを Terraform で管理する。現時点ではスタブのみで、リソース定義は順次追加していく。

## アーキテクチャ

- **Provider**: `cloudflare/cloudflare ~> 5.0`
- **Backend**: Cloudflare R2（S3 互換 API）
  - Bucket: `terraform-state`（他プロジェクトと共用。`cpa-study-note` 等と同居）
  - Key: `actiko/<env>/terraform.tfstate`（プロジェクト名プレフィクス + `stg` / `prod` 分離）
- **環境分離**: `env/<env>.tfvars` と `-backend-config` で切り替え（Terraform workspaces は使わない）

## 初回セットアップ（ユーザー手動）

CI を動かす前に以下を済ませる必要がある。

### 1. R2 bucket

`terraform-state` bucket の作成。

### 2. R2 API Token

`terraform-state` bucket に Object Read&Write 権限を持つ R2 API Token が既に発行済みなら流用する。まだ actiko repo に登録されていない場合、同じ token の Access Key ID / Secret Access Key を下記の secret 名で登録する（or 新規 token を同権限で発行する）。

### 3. GitHub Secrets / Vars を登録

Repo Settings → Secrets and variables → Actions:

| Secret 名 | 用途 |
|---|---|
| `TF_STATE_R2_ACCESS_KEY_ID` | State backend (`terraform-state` bucket) の R2 Access Key ID |
| `TF_STATE_R2_SECRET_ACCESS_KEY` | State backend の R2 Secret Access Key |
| `TF_CLOUDFLARE_API_TOKEN` | Cloudflare provider 用 API Token (R2:Edit / KV:Edit / Hyperdrive:Edit 等、Terraform で管理するリソースの権限を付与) |
| `CF_ACCOUNT_ID` | 既存。R2 endpoint URL と `TF_VAR_cloudflare_account_id` に使う |

> **注意**: `TF_CLOUDFLARE_API_TOKEN` は `CF_WORKERS_TOKEN`（Workers デプロイ用）とは別に発行する。Terraform 管理対象に追加したリソース分の scope を都度追加すること。

### 4. Environment protection rules を設定

Repo Settings → Environments で `infra-stg` / `infra-prod` を作成し、`apply` / `destroy` の承認レビュアーを設定する。

## CI からの使い方

`.github/workflows/infra.yml` の `workflow_dispatch` を手動実行:

- **action**: `plan` / `apply` / `destroy`
- **env**: `stg` / `prod`

PR で `terraform/**` を変更すると、両環境の plan が自動で PR コメントに貼られる。

## ローカル実行

```bash
cd terraform

# Backend 設定を生成（CF_ACCOUNT_ID を自分の値に置換）
cat > backend.local.tfbackend <<EOF
bucket = "terraform-state"
key    = "actiko/stg/terraform.tfstate"
region = "auto"
endpoints = { s3 = "https://<CF_ACCOUNT_ID>.r2.cloudflarestorage.com" }
skip_credentials_validation = true
skip_metadata_api_check     = true
skip_region_validation      = true
skip_requesting_account_id  = true
skip_s3_checksum            = true
use_path_style              = true
EOF

# R2 token を環境変数で渡す
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."

# Cloudflare provider token
export TF_VAR_cloudflare_api_token="..."
export TF_VAR_cloudflare_account_id="..."

terraform init -backend-config=backend.local.tfbackend
terraform plan -var-file=env/stg.tfvars
```

## ファイル構成

```
terraform/
├── provider.tf              # terraform / provider / backend ブロック
├── variables.tf             # 共通変数
├── env/
│   ├── stg.tfvars           # stg 用 variable 値
│   └── prod.tfvars          # prod 用 variable 値
├── terraform.tfvars.example # ローカル用サンプル
└── README.md
```

リソース定義はドメインごとにファイルを分けて追加する（`r2.tf`, `workers.tf`, `pages.tf`, `kv.tf` 等）。

## 現在の管理対象

| リソース | Terraform | 備考 |
|---|---|---|
| R2 bucket `actiko-<env>` | ✅ (`r2.tf`) | 既存 bucket を `import` block で取り込み。`prevent_destroy` 付き |
| KV namespace (rate limit) | ✅ (`kv.tf`) | 既存 namespace を `import` block で取り込み。`prevent_destroy` 付き |
| Hyperdrive config | ❌ | 手動作成、ID は `HYPERDRIVE_ID_*` secret。origin (DB接続情報) 管理方針決定後に取り込み |
| Workers script | ❌ | wrangler deploy 管轄 |
| WAE datasets | ❌ | wrangler.toml binding で auto-provision |
| Neon DB | ❌ | Cloudflare 外 |

### 既存リソース取り込み手順（初回のみ）

各リソースは **resource定義 + `import { }` block** を入れた状態でこの PR をマージし、以下の順で適用する:

1. Actions → **Infra (Terraform)** → Run workflow:
   - `action: apply`, `env: stg` で実行
   - 成功したら `env: prod` でも実行
2. import 完了後、フォローアップ PR で `import { }` block を削除してコードを恒久化
3. 同時にフォローアップで、該当の one-shot 変数 (例: `kv_rate_limit_id_existing`) と workflow の `Export env-specific TF_VARs` ステップ該当行も削除

### One-shot import 変数

import block が ID を必要とする場合、GitHub secret から env-specific に注入する:

| TF 変数 | 注入元 secret (stg / prod) |
|---|---|
| `kv_rate_limit_id_existing` | `KV_RATE_LIMIT_ID_STG` / `KV_RATE_LIMIT_ID_PROD` |

### 今後の拡張

Hyperdrive は origin フィールドに DB 接続情報（password 含む）を持つため、Terraform 管理方針の判断が必要:

- **A. identity 管理のみ**: `ignore_changes = [origin]` で name/ID だけ管理。DB接続情報は dashboard/wrangler 管轄のまま
- **B. origin まで管理**: password を `TF_VAR_neon_db_password_<env>` で渡して完全管理

A が最小スコープ。B は `deploy.yml` や Neon 側の認証情報管理と整合する必要あり。
