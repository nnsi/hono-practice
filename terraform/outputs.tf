output "r2_bucket_name" {
  description = "R2 bucket name for this environment."
  value       = cloudflare_r2_bucket.storage.name
}

output "kv_rate_limit_id" {
  description = "KV namespace ID (rate limit)."
  value       = cloudflare_workers_kv_namespace.rate_limit.id
}
