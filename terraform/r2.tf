resource "cloudflare_r2_bucket" "storage" {
  account_id = var.cloudflare_account_id
  name       = "${var.r2_bucket_name}-${var.environment}"
  location   = var.r2_bucket_location
}

resource "cloudflare_r2_bucket" "backups" {
  count      = var.environment == "production" ? 1 : 0
  account_id = var.cloudflare_account_id
  name       = "${var.r2_bucket_name}-backups"
  location   = var.r2_bucket_location
}

resource "cloudflare_r2_bucket" "uploads" {
  account_id = var.cloudflare_account_id
  name       = "${var.r2_bucket_name}-uploads-${var.environment}"
  location   = var.r2_bucket_location
}

resource "cloudflare_r2_bucket_cors_configuration" "storage_cors" {
  bucket_name = cloudflare_r2_bucket.storage.name
  account_id  = var.cloudflare_account_id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "POST", "PUT", "DELETE"]
    allowed_origins = var.custom_domain != "" ? [
      "https://${var.custom_domain}",
      "https://api.${var.custom_domain}"
    ] : ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "cloudflare_r2_bucket_cors_configuration" "uploads_cors" {
  bucket_name = cloudflare_r2_bucket.uploads.name
  account_id  = var.cloudflare_account_id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "POST", "PUT"]
    allowed_origins = var.custom_domain != "" ? [
      "https://${var.custom_domain}",
      "https://api.${var.custom_domain}"
    ] : ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "cloudflare_r2_bucket_lifecycle_configuration" "uploads_lifecycle" {
  bucket_name = cloudflare_r2_bucket.uploads.name
  account_id  = var.cloudflare_account_id

  rule {
    id     = "delete-old-uploads"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 7
    }
  }

  rule {
    id     = "delete-orphaned-uploads"
    status = "Enabled"

    filter {
      prefix = "orphaned/"
    }

    expiration {
      days = 30
    }
  }
}

resource "cloudflare_r2_bucket_lifecycle_configuration" "backups_lifecycle" {
  count       = var.environment == "production" ? 1 : 0
  bucket_name = cloudflare_r2_bucket.backups[0].name
  account_id  = var.cloudflare_account_id

  rule {
    id     = "delete-old-backups"
    status = "Enabled"

    filter {}

    expiration {
      days = 90
    }
  }
}