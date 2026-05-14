import type {
  AuthStateRepository,
  AuthTutorialStatus,
} from "@packages/auth-client";
import type { TutorialStatus } from "@packages/frontend-shared/hooks";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";

type AuthStateRow = {
  user_id: string | null;
  last_login_at: string | null;
  plan: string | null;
  tutorial_status: string | null;
};

async function readRow(): Promise<AuthStateRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AuthStateRow>(
    "SELECT user_id, last_login_at, plan, tutorial_status FROM auth_state WHERE id = 'current'",
  );
  return row ?? null;
}

async function ensureRow(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR IGNORE INTO auth_state (id, user_id, last_login_at, plan, tutorial_status) VALUES ('current', NULL, NULL, 'free', NULL)",
  );
}

// 単一カラムのみ更新 (read-then-write race を避ける)。`auth_state` には常に id='current'
// の 1 行のみ存在し、ensureRow で初期化を保証する。
async function updateColumn(
  column: "user_id" | "last_login_at" | "plan" | "tutorial_status",
  value: string | null,
): Promise<void> {
  await ensureRow();
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE auth_state SET ${column} = ? WHERE id = 'current'`,
    [value],
  );
  dbEvents.emit("auth_state");
}

export function createMobileAuthStateRepository(): AuthStateRepository {
  return {
    async getCurrentUserId() {
      const row = await readRow();
      return row?.user_id || null;
    },
    async getLastLoginAt() {
      const row = await readRow();
      return row?.last_login_at || null;
    },
    setLastLoginAt: (value) => updateColumn("last_login_at", value),
    setUserId: (userId) => updateColumn("user_id", userId),
    setPlan: (plan) => updateColumn("plan", plan),
    setTutorialStatus: (status: AuthTutorialStatus) =>
      updateColumn("tutorial_status", status),
    clearLastLoginAt: () => updateColumn("last_login_at", ""),
  };
}

export async function getTutorialStatus(): Promise<TutorialStatus> {
  const row = await readRow();
  const val = row?.tutorial_status ?? null;
  if (val === "pending" || val === "done") return val;
  return null;
}

export function setTutorialStatus(status: TutorialStatus): Promise<void> {
  return updateColumn("tutorial_status", status);
}
