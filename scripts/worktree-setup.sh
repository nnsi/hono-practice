#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# worktree-setup.sh — Git worktree + isolated DB setup
# ============================================================
# Usage: ./scripts/worktree-setup.sh <name> [port-offset] [--no-seed]
#
# Creates:
#   .worktrees/<name>/        — git worktree (branch: wt/<name>)
#   db_wt_<name> (Postgres)   — isolated database with migrations applied
#   Env files with correct ports and DATABASE_URL
#
# Port allocation (base + offset):
#   API:  3456 + offset
#   Vite: 2460 + offset
#
# Examples:
#   ./scripts/worktree-setup.sh feature-auth       # auto offset
#   ./scripts/worktree-setup.sh feature-auth 2      # explicit offset=2
#   ./scripts/worktree-setup.sh feature-auth 1 --no-seed  # skip seed

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- args ---
NAME="${1:?Usage: worktree-setup.sh <name> [port-offset] [--seed]}"
OFFSET="${2:-}"
SEED=true
for arg in "$@"; do [[ "$arg" == "--no-seed" ]] && SEED=false; done
for arg in "$@"; do [[ "$arg" == "--seed" ]] && SEED=true; done

# offset がフラグだった場合は空扱い
[[ "${OFFSET:-}" == "--seed" || "${OFFSET:-}" == "--no-seed" ]] && OFFSET=""

# --- derived values ---
DB_NAME="db_wt_$(echo "$NAME" | tr '.-' '__')"
WT_DIR="$REPO_ROOT/.worktrees/$NAME"

# Auto-assign port offset: count existing worktree dirs + 1
if [ -z "$OFFSET" ]; then
  EXISTING=$(find "$REPO_ROOT/.worktrees" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  OFFSET=$((EXISTING + 1))
fi

API_PORT=$((3456 + OFFSET))
VITE_PORT=$((2460 + OFFSET))

echo "=== Worktree Setup ==="
echo "  Name:       $NAME"
echo "  Path:       .worktrees/$NAME"
echo "  Database:   $DB_NAME"
echo "  API Port:   $API_PORT"
echo "  Vite Port:  $VITE_PORT"
echo "  Seed:       $SEED"
echo ""

# --- preflight: Docker running? ---
if ! docker compose -f "$REPO_ROOT/docker-compose.yml" ps --status running 2>/dev/null | grep -q db; then
  echo "ERROR: Postgres container is not running."
  echo "  Run: docker compose up -d"
  exit 1
fi

# --- 1. Create database ---
echo "[1/5] Creating database '$DB_NAME'..."
docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T db \
  psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>&1 | grep -v "^$" || true

# --- 2. Create worktree ---
echo "[2/5] Creating git worktree..."
if [ -d "$WT_DIR" ]; then
  echo "  Worktree already exists at $WT_DIR, skipping creation."
else
  mkdir -p "$REPO_ROOT/.worktrees"
  # Try: new branch → existing branch → detached HEAD
  git -C "$REPO_ROOT" worktree add "$WT_DIR" -b "wt/$NAME" 2>/dev/null \
    || git -C "$REPO_ROOT" worktree add "$WT_DIR" "wt/$NAME" 2>/dev/null \
    || git -C "$REPO_ROOT" worktree add --detach "$WT_DIR"
  echo "  Created."
fi

# --- 3. Setup env files ---
echo "[3/5] Setting up environment files..."

# Backend .env (dotenv reads .env by default)
# .env.local is the git-tracked template; copy it to .env for actual use
MAIN_BE_TEMPLATE="$REPO_ROOT/apps/backend/.env.local"
WT_BE_ENV="$WT_DIR/apps/backend/.env"
if [ -f "$MAIN_BE_TEMPLATE" ]; then
  cp "$MAIN_BE_TEMPLATE" "$WT_BE_ENV"
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@localhost:5435/$DB_NAME|" "$WT_BE_ENV"
  sed -i "s|^API_PORT=.*|API_PORT=$API_PORT|" "$WT_BE_ENV"
  sed -i "s|^APP_URL=.*|APP_URL=http://localhost:$VITE_PORT|" "$WT_BE_ENV"
  sed -i "s|^APP_URL_V2=.*|APP_URL_V2=http://localhost:$VITE_PORT|" "$WT_BE_ENV"
  echo "  apps/backend/.env → OK"
else
  echo "  WARNING: $MAIN_BE_TEMPLATE not found. Create it manually in the worktree."
fi

# Frontend .env
MAIN_FE_ENV="$REPO_ROOT/apps/frontend/.env"
WT_FE_ENV="$WT_DIR/apps/frontend/.env"
if [ -f "$MAIN_FE_ENV" ]; then
  cp "$MAIN_FE_ENV" "$WT_FE_ENV"
  sed -i "s|^VITE_API_URL=.*|VITE_API_URL=http://localhost:$API_PORT|" "$WT_FE_ENV"
  # VITE_PORT for vite.config.ts (reads from env)
  if ! grep -q "^VITE_PORT=" "$WT_FE_ENV" 2>/dev/null; then
    echo "VITE_PORT=$VITE_PORT" >> "$WT_FE_ENV"
  else
    sed -i "s|^VITE_PORT=.*|VITE_PORT=$VITE_PORT|" "$WT_FE_ENV"
  fi
  echo "  apps/frontend/.env → OK"
else
  echo "  WARNING: $MAIN_FE_ENV not found."
fi

# Root .env (for drizzle-kit / seed scripts)
cat > "$WT_DIR/.env" << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/$DB_NAME
EOF
echo "  .env (root) → OK"

# --- 4. Install dependencies ---
echo "[4/5] Installing dependencies..."
(cd "$WT_DIR" && pnpm install --frozen-lockfile 2>/dev/null || pnpm install)

# --- 5. Run migrations ---
echo "[5/5] Running database migrations..."
(cd "$WT_DIR" && DATABASE_URL="postgresql://postgres:postgres@localhost:5435/$DB_NAME" pnpm db-migrate)

# --- 6. Seed data (default: enabled, skip with --no-seed) ---
if [ "$SEED" = true ]; then
  echo "[6/6] Seeding development data..."
  (cd "$WT_DIR" && DATABASE_URL="postgresql://postgres:postgres@localhost:5435/$DB_NAME" pnpm db-seed)
else
  echo "[6/6] Skipping seed (use default or --seed to seed)"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Start dev servers:"
echo "  cd .worktrees/$NAME"
echo "  pnpm dev"
echo ""
echo "Cleanup:"
echo "  ./scripts/worktree-cleanup.sh $NAME"
