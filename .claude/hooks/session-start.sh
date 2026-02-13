#!/usr/bin/env bash
set -eu

# Only run in remote environment (Claude Code on the web)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "Setting up development environment for Claude Code on the web..."

# Change to project directory
cd "$CLAUDE_PROJECT_DIR"

# Install npm dependencies
echo "Installing npm dependencies..."
npm install

# Install Playwright browsers for E2E tests (optional, may fail in restricted environments)
echo "Installing Playwright chromium browser..."
if npx playwright install chromium 2>/dev/null; then
  echo "Playwright chromium installed successfully"
else
  echo "Warning: Playwright installation failed (this is expected in some restricted environments)"
  echo "E2E tests will not be available, but API integration tests will work"
fi

echo "Environment setup complete!"
