output "worker_id" {
  description = "The ID of the deployed Worker"
  value       = cloudflare_worker_script.api.id
}

output "worker_routes" {
  description = "The routes configured for the Worker"
  value       = [for route in cloudflare_worker_route.api_routes : route.pattern]
}

output "pages_project_id" {
  description = "The ID of the Pages project"
  value       = cloudflare_pages_project.web.id
}

output "pages_url" {
  description = "The default URL of the Pages project"
  value       = "https://${cloudflare_pages_project.web.subdomain}.pages.dev"
}

output "pages_custom_domain" {
  description = "The custom domain configured for Pages"
  value       = var.custom_domain != "" ? cloudflare_pages_domain.web_domain[0].domain : null
}

output "r2_bucket_storage_name" {
  description = "The name of the main R2 storage bucket"
  value       = cloudflare_r2_bucket.storage.name
}

output "r2_bucket_uploads_name" {
  description = "The name of the R2 uploads bucket"
  value       = cloudflare_r2_bucket.uploads.name
}

output "r2_bucket_backups_name" {
  description = "The name of the R2 backups bucket (production only)"
  value       = var.environment == "production" ? cloudflare_r2_bucket.backups[0].name : null
}

output "api_domain" {
  description = "The API domain (if configured)"
  value       = var.custom_domain != "" ? "api.${var.custom_domain}" : null
}

output "environment" {
  description = "The deployment environment"
  value       = var.environment
}