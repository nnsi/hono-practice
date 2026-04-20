resource "cloudflare_r2_bucket" "storage" {
  account_id = var.cloudflare_account_id
  name       = "actiko-${var.environment}"
  location   = "APAC"

  lifecycle {
    prevent_destroy = true
    # location は作成時のみ設定される。既存と差分が出ても re-create しないよう無視。
    ignore_changes = [location]
  }
}

# 既存の手動作成された R2 bucket を state に取り込む。
# 初回 apply 後、この import block はフォローアップ PR で削除する。
import {
  to = cloudflare_r2_bucket.storage
  id = "${var.cloudflare_account_id}/actiko-${var.environment}"
}
