resource "cloudflare_workers_kv_namespace" "rate_limit" {
  account_id = var.cloudflare_account_id
  title      = "actiko-rate-limit-${var.environment}"

  lifecycle {
    prevent_destroy = true
    # 既存 namespace の title が上記と異なっても rename しないよう無視。
    ignore_changes = [title]
  }
}

# 既存の手動作成された KV namespace を state に取り込む。
# 初回 apply 後、フォローアップ PR でこの block を削除する。
# ID は GitHub secret `KV_RATE_LIMIT_ID_<ENV>` → TF_VAR_kv_rate_limit_id_existing 経由で注入。
import {
  to = cloudflare_workers_kv_namespace.rate_limit
  id = "${var.cloudflare_account_id}/${var.kv_rate_limit_id_existing}"
}
