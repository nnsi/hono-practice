# 環境変数から自動的に読み込まれる変数の例
# TF_VAR_プレフィックスをつけた環境変数が自動的にマッピングされる

# 例: export TF_VAR_cloudflare_api_token="your-token"
variable "cloudflare_api_token" {
  description = "Cloudflare API token - set via TF_VAR_cloudflare_api_token env var"
  type        = string
  sensitive   = true
  # デフォルト値を設定しない - 環境変数から取得を強制
}

# 例: export TF_VAR_jwt_secret="your-secret"
variable "jwt_secret" {
  description = "JWT Secret - set via TF_VAR_jwt_secret env var"
  type        = string
  sensitive   = true
}

# 例: export TF_VAR_database_url="postgresql://..."
variable "database_url" {
  description = "Database URL - set via TF_VAR_database_url env var"
  type        = string
  sensitive   = true
}

# 例: export TF_VAR_encryption_key="your-key"
variable "encryption_key" {
  description = "Encryption key - set via TF_VAR_encryption_key env var"
  type        = string
  sensitive   = true
}

# 環境変数のバリデーション
variable "validate_secrets" {
  description = "Validate that all required secrets are provided"
  type        = bool
  default     = true

  validation {
    condition = var.validate_secrets == false || (
      can(var.cloudflare_api_token) &&
      can(var.jwt_secret) &&
      can(var.database_url) &&
      can(var.encryption_key)
    )
    error_message = "Missing required secrets. Please set TF_VAR_* environment variables."
  }
}

# ローカル変数で統合（workers.tfで使用）
locals {
  worker_secrets_from_env = {
    JWT_SECRET     = var.jwt_secret
    ENCRYPTION_KEY = var.encryption_key
  }

  worker_environment_from_env = {
    DATABASE_URL = var.database_url
  }
}

# 既存のworker_secretsとマージ
locals {
  final_worker_secrets = merge(
    var.worker_secrets,
    local.worker_secrets_from_env
  )

  final_worker_environment = merge(
    var.worker_environment_variables,
    local.worker_environment_from_env
  )
}