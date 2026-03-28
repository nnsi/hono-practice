#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# worktree-cleanup.sh — Remove worktree + drop its database
# ============================================================
# Usage: ./scripts/worktree-cleanup.sh <name>
#
# Removes:
#   .worktrees/<name>/      — git worktree directory
#   wt/<name>               — git branch (if exists)
#   db_wt_<name> (Postgres) — isolated database

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

NAME="${1:?Usage: worktree-cleanup.sh <name>}"
DB_NAME="db_wt_$(echo "$NAME" | tr '.-' '__')"
WT_DIR="$REPO_ROOT/.worktrees/$NAME"

echo "=== Worktree Cleanup ==="
echo "  Name:     $NAME"
echo "  Path:     .worktrees/$NAME"
echo "  Database: $DB_NAME"
echo ""

# --- 1. Drop database ---
echo "[1/3] Dropping database '$DB_NAME'..."
if docker compose -f "$REPO_ROOT/docker-compose.yml" ps --status running 2>/dev/null | grep -q db; then
  # Terminate active connections first
  docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T db \
    psql -U postgres -c "
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
    " > /dev/null 2>&1 || true

  docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T db \
    psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1 | grep -v "^$" || true
  echo "  Database dropped."
else
  echo "  WARNING: Postgres container is not running. Database not dropped."
  echo "  Run manually: docker compose exec db psql -U postgres -c \"DROP DATABASE IF EXISTS $DB_NAME;\""
fi

# --- 2. Remove worktree ---
echo "[2/3] Removing git worktree..."
if [ -d "$WT_DIR" ]; then
  git -C "$REPO_ROOT" worktree remove --force "$WT_DIR" 2>/dev/null || {
    echo "  Force-removing directory..."
    rm -rf "$WT_DIR"
    git -C "$REPO_ROOT" worktree prune
  }
  echo "  Worktree removed."
else
  echo "  Worktree directory not found. Pruning stale references..."
  git -C "$REPO_ROOT" worktree prune
fi

# --- 3. Delete branch ---
echo "[3/3] Cleaning up branch..."
git -C "$REPO_ROOT" branch -D "wt/$NAME" 2>/dev/null && echo "  Branch 'wt/$NAME' deleted." || echo "  No branch 'wt/$NAME' found."

echo ""
echo "=== Cleanup Complete ==="
