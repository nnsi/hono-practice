terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # Cloudflare R2 (S3 互換) を state backend として使う。
  # bucket/key/endpoints 等は `-backend-config` で init 時に渡す（環境別）。
  backend "s3" {}
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
