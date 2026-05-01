#!/usr/bin/env bash
# PreToolUse hook: block manual DDL commands via psql
# Allow: pnpm run db-migrate, drizzle-kit migrate, SELECT/INSERT/UPDATE/DELETE
# Block: ALTER TABLE, DROP TABLE, CREATE TABLE, etc.

set -euo pipefail

COMMAND=$(jq -r '.tool_input.command // ""')

# Only check commands that involve psql
if ! echo "$COMMAND" | grep -qi 'psql'; then
  exit 0
fi

# Allow db-migrate (drizzle migration)
if echo "$COMMAND" | grep -qi 'db-migrate\|drizzle-kit migrate\|drizzle-kit push'; then
  exit 0
fi

# Block DDL statements
DDL_PATTERN='ALTER\s+TABLE|DROP\s+TABLE|CREATE\s+TABLE|DROP\s+INDEX|CREATE\s+INDEX|ADD\s+COLUMN|DROP\s+COLUMN|DROP\s+CONSTRAINT|ADD\s+CONSTRAINT|ALTER\s+COLUMN'

if echo "$COMMAND" | grep -Pqi "$DDL_PATTERN"; then
  echo '{"decision":"block","reason":"DDL文の直接実行は禁止です。pnpm run db-migrate を使ってください。"}'
  exit 0
fi

exit 0
