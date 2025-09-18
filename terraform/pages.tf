resource "cloudflare_pages_project" "web" {
  account_id        = var.cloudflare_account_id
  name              = var.pages_project_name
  production_branch = var.pages_production_branch

  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = "/"
  }

  source {
    type = "github"
    config {
      owner                         = "your-github-username"
      repo_name                     = "actiko"
      production_branch             = var.pages_production_branch
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "all"
      preview_branch_includes       = ["develop", "feature/*"]
      preview_branch_excludes       = ["main"]
    }
  }

  deployment_configs {
    preview {
      environment_variables = merge(
        var.pages_environment_variables,
        {
          NODE_ENV = "development"
        }
      )
      compatibility_date  = "2024-01-01"
      compatibility_flags = ["nodejs_compat"]
    }

    production {
      environment_variables = merge(
        var.pages_environment_variables,
        {
          NODE_ENV = "production"
        }
      )
      compatibility_date  = "2024-01-01"
      compatibility_flags = ["nodejs_compat"]
    }
  }
}

resource "cloudflare_pages_domain" "web_domain" {
  count      = var.custom_domain != "" ? 1 : 0
  account_id = var.cloudflare_account_id
  project_name = cloudflare_pages_project.web.name
  domain     = var.custom_domain
}