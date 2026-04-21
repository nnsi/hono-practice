import type { TutorialStatus } from "@packages/frontend-shared/hooks";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";

export type AuthStateRecord = {
  userId: string | null;
  lastLoginAt: string | null;
  plan: string | null;
  tutorialStatus: TutorialStatus;
};

export async function getTutorialStatus(): Promise<TutorialStatus> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ tutorial_status: string | null }>(
    "SELECT tutorial_status FROM auth_state WHERE id = 'current'",
  );
  const val = row?.tutorial_status ?? null;
  if (val === "pending" || val === "done") return val;
  return null;
}

export async function setTutorialStatus(status: TutorialStatus): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE auth_state SET tutorial_status = ? WHERE id = 'current'",
    [status],
  );
  dbEvents.emit("auth_state");
}

export async function setUserIdAndLastLogin(
  userId: string,
  lastLoginAt: string,
): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{
    plan: string | null;
    tutorial_status: string | null;
  }>("SELECT plan, tutorial_status FROM auth_state WHERE id = 'current'");
  await db.runAsync(
    "INSERT OR REPLACE INTO auth_state (id, user_id, last_login_at, plan, tutorial_status) VALUES ('current', ?, ?, ?, ?)",
    [
      userId,
      lastLoginAt,
      existing?.plan ?? "free",
      existing?.tutorial_status ?? null,
    ],
  );
  dbEvents.emit("auth_state");
}
