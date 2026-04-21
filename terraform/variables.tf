variable "cloudflare_api_token" {
  description = "Cloudflare API token. CI では TF_VAR_cloudflare_api_token 経由で渡す。"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "environment" {
  description = "Deployment environment (stg or prod)."
  type        = string

  validation {
    condition     = contains(["stg", "prod"], var.environment)
    error_message = "environment must be one of: stg, prod."
  }
}

# -------- one-shot import helpers --------
# 既存リソースを Terraform state に引き寄せるための ID 注入用変数。
# 対応 resource の `import { }` block が削除されたら不要になる（default="" のまま放置可）。

variable "kv_rate_limit_id_existing" {
  description = "Existing KV namespace ID for one-shot import (rate limit). Populated from GitHub secret KV_RATE_LIMIT_ID_<ENV>."
  type        = string
  default     = ""
}
