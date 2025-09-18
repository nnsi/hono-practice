#!/bin/bash

# Terraformを安全に実行するためのスクリプト

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Terraform Apply Script ===${NC}"

# .env.secretsファイルの確認
if [ -f ".env.secrets" ]; then
    echo -e "${GREEN}Loading secrets from .env.secrets...${NC}"
    source .env.secrets
else
    echo -e "${YELLOW}Warning: .env.secrets not found${NC}"
    echo "You can create it from .env.secrets.example:"
    echo "  cp .env.secrets.example .env.secrets"
    echo ""
fi

# 必須環境変数のチェック
REQUIRED_VARS=(
    "TF_VAR_cloudflare_api_token"
    "TF_VAR_cloudflare_account_id"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=($var)
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set these variables in .env.secrets or export them:"
    echo "  export TF_VAR_cloudflare_api_token='your-token'"
    exit 1
fi

# Terraform初期化
if [ ! -d ".terraform" ]; then
    echo -e "${GREEN}Initializing Terraform...${NC}"
    terraform init
fi

# Plan実行
echo -e "${GREEN}Running terraform plan...${NC}"
terraform plan -out=tfplan

# 確認
echo -e "${YELLOW}Do you want to apply these changes? (yes/no)${NC}"
read -r response

if [[ "$response" == "yes" ]]; then
    echo -e "${GREEN}Applying changes...${NC}"
    terraform apply tfplan
    rm -f tfplan
    echo -e "${GREEN}✓ Changes applied successfully!${NC}"
else
    echo -e "${YELLOW}Apply cancelled.${NC}"
    rm -f tfplan
    exit 0
fi