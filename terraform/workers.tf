resource "cloudflare_worker_script" "api" {
  account_id = var.cloudflare_account_id
  name       = var.worker_name
  content    = file(var.worker_script_path)

  compatibility_date = "2024-01-01"
  compatibility_flags = [
    "nodejs_compat"
  ]

  dynamic "plain_text_binding" {
    for_each = var.worker_environment_variables
    content {
      name = plain_text_binding.key
      text = plain_text_binding.value
    }
  }

  dynamic "secret_text_binding" {
    for_each = var.worker_secrets
    content {
      name = secret_text_binding.key
      text = secret_text_binding.value
    }
  }

  dynamic "r2_bucket_binding" {
    for_each = cloudflare_r2_bucket.storage[*]
    content {
      name        = "R2_STORAGE"
      bucket_name = r2_bucket_binding.value.name
    }
  }

  lifecycle {
    ignore_changes = [content]
  }
}

resource "cloudflare_worker_route" "api_routes" {
  count      = length(var.worker_routes)
  account_id = var.cloudflare_account_id
  pattern    = var.worker_routes[count.index]
  script_name = cloudflare_worker_script.api.name
}

resource "cloudflare_worker_domain" "api_domain" {
  count      = var.custom_domain != "" ? 1 : 0
  account_id = var.cloudflare_account_id
  hostname   = "api.${var.custom_domain}"
  service    = cloudflare_worker_script.api.name
  zone_id    = data.cloudflare_zone.main[0].id
}

data "cloudflare_zone" "main" {
  count      = var.custom_domain != "" ? 1 : 0
  account_id = var.cloudflare_account_id
  name       = var.custom_domain
}