variable "cloudflare_api_token" {
  description = "Cloudflare API token with permissions for Workers, Pages, and R2"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging, development)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "actiko"
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker"
  type        = string
  default     = "actiko-api"
}

variable "worker_script_path" {
  description = "Path to the Worker script file"
  type        = string
  default     = "../dist/worker.js"
}

variable "worker_routes" {
  description = "Routes for the Worker"
  type        = list(string)
  default     = []
}

variable "pages_project_name" {
  description = "Name of the Cloudflare Pages project"
  type        = string
  default     = "actiko-web"
}

variable "pages_production_branch" {
  description = "Production branch for Pages deployment"
  type        = string
  default     = "main"
}

variable "r2_bucket_name" {
  description = "Name of the R2 bucket"
  type        = string
  default     = "actiko-storage"
}

variable "r2_bucket_location" {
  description = "R2 bucket location hint"
  type        = string
  default     = "apac"
}

variable "custom_domain" {
  description = "Custom domain for the application"
  type        = string
  default     = ""
}

variable "worker_environment_variables" {
  description = "Environment variables for the Worker"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "worker_secrets" {
  description = "Secret environment variables for the Worker"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "pages_environment_variables" {
  description = "Environment variables for Pages"
  type        = map(string)
  default     = {}
}

variable "enable_worker_logpush" {
  description = "Enable log push for Worker"
  type        = bool
  default     = false
}

variable "worker_cpu_limit" {
  description = "CPU millisecond limit for the Worker (10-50 for free/paid plans)"
  type        = number
  default     = 10
}