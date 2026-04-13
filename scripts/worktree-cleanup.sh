#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# worktree-cleanup.sh — Remove worktree + drop its database
# ============================================================
# Usage: ./scripts/worktree-cleanup.sh <name>
#
# Removes:
#   .worktrees/<name>/      — git worktree directory
#   <actual worktree branch> — git branch currently checked out in the worktree (if any)
#   db_wt_<name> (Postgres) — isolated database

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

NAME="${1:?Usage: worktree-cleanup.sh <name>}"
DB_NAME="db_wt_$(echo "$NAME" | tr '.-' '__')"
WT_DIR="$REPO_ROOT/.worktrees/$NAME"
WT_BRANCH=""

if [ -d "$WT_DIR" ]; then
  WT_BRANCH="$(git -C "$WT_DIR" branch --show-current 2>/dev/null || true)"
fi

echo "=== Worktree Cleanup ==="
echo "  Name:     $NAME"
echo "  Path:     .worktrees/$NAME"
echo "  Database: $DB_NAME"
if [ -n "$WT_BRANCH" ]; then
  echo "  Branch:   $WT_BRANCH"
else
  echo "  Branch:   (detached HEAD or unavailable)"
fi
echo ""

# --- 1. Drop database ---
echo "[1/4] Dropping database '$DB_NAME'..."
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

# --- 2. Kill processes using worktree ---
echo "[2/4] Killing processes using worktree..."
if [ -d "$WT_DIR" ]; then
  PIDS=()
  if command -v wmic &>/dev/null; then
    # Windows: kill node.exe processes whose commandline contains the worktree name
    mapfile -t PIDS < <(
      wmic process where "name='node.exe' and commandline like '%$NAME%'" get processid 2>/dev/null \
        | grep -oP '\d+' || true
    )
  elif command -v lsof &>/dev/null; then
    # Unix: use lsof to find processes with open files in worktree
    mapfile -t PIDS < <(
      lsof +D "$WT_DIR" 2>/dev/null | awk 'NR>1 {print $2}' | sort -u || true
    )
  fi

  if [ "${#PIDS[@]}" -gt 0 ]; then
    for pid in "${PIDS[@]}"; do
      if command -v taskkill &>/dev/null; then
        taskkill //PID "$pid" //F 2>/dev/null && echo "  Killed PID $pid" || true
      else
        kill "$pid" 2>/dev/null && echo "  Killed PID $pid" || true
      fi
    done
    sleep 1
  else
    echo "  No processes found."
  fi
else
  echo "  No worktree directory found, skipping."
fi

# --- 3. Remove worktree ---
echo "[3/4] Removing git worktree..."
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

# --- 4. Delete branch ---
echo "[4/4] Cleaning up branch..."
if [ -n "$WT_BRANCH" ]; then
  git -C "$REPO_ROOT" branch -D "$WT_BRANCH" 2>/dev/null \
    && echo "  Branch '$WT_BRANCH' deleted." \
    || echo "  Branch '$WT_BRANCH' could not be deleted."
else
  echo "  No checked-out branch found for this worktree. Skipping branch deletion."
fi

echo ""
echo "=== Cleanup Complete ==="
