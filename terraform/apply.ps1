# PowerShell版 Terraform実行スクリプト

Write-Host "=== Terraform Apply Script ===" -ForegroundColor Green

# .env.secretsファイルの確認と読み込み
$envFile = ".env.secrets"
if (Test-Path $envFile) {
    Write-Host "Loading secrets from .env.secrets..." -ForegroundColor Green

    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^export\s+(\w+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2].Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "Warning: .env.secrets not found" -ForegroundColor Yellow
    Write-Host "You can create it from .env.secrets.example:"
    Write-Host "  Copy-Item .env.secrets.example .env.secrets"
    Write-Host ""
}

# 必須環境変数のチェック
$requiredVars = @(
    "TF_VAR_cloudflare_api_token",
    "TF_VAR_cloudflare_account_id"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not [Environment]::GetEnvironmentVariable($var, "Process")) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "Error: Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var"
    }
    Write-Host ""
    Write-Host "Please set these variables in .env.secrets or set them:"
    Write-Host '  $env:TF_VAR_cloudflare_api_token = "your-token"'
    exit 1
}

# Terraform初期化
if (-not (Test-Path ".terraform")) {
    Write-Host "Initializing Terraform..." -ForegroundColor Green
    terraform init
}

# Plan実行
Write-Host "Running terraform plan..." -ForegroundColor Green
terraform plan -out=tfplan

# 確認
$response = Read-Host "Do you want to apply these changes? (yes/no)"

if ($response -eq "yes") {
    Write-Host "Applying changes..." -ForegroundColor Green
    terraform apply tfplan
    Remove-Item tfplan -Force
    Write-Host "✓ Changes applied successfully!" -ForegroundColor Green
} else {
    Write-Host "Apply cancelled." -ForegroundColor Yellow
    Remove-Item tfplan -Force -ErrorAction SilentlyContinue
    exit 0
}