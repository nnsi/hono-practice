import type { AuthStateRepository } from "@packages/auth-client";

import { db } from "../db/schema";

export function createWebAuthStateRepository(): AuthStateRepository {
  const getCurrent = () => db.authState.get("current");
  const ensureRow = async () => {
    const row = await getCurrent();
    if (row) return row;
    const newRow = { id: "current" as const, userId: "", lastLoginAt: "" };
    await db.authState.put(newRow);
    return newRow;
  };
  return {
    async getCurrentUserId() {
      const row = await getCurrent();
      return row?.userId || null;
    },
    async getLastLoginAt() {
      const row = await getCurrent();
      return row?.lastLoginAt || null;
    },
    async setLastLoginAt(value) {
      await ensureRow();
      await db.authState.update("current", { lastLoginAt: value });
    },
    async setUserId(userId) {
      await ensureRow();
      await db.authState.update("current", { userId });
    },
    async setPlan(plan) {
      await ensureRow();
      await db.authState.update("current", { plan });
    },
    async setTutorialStatus(status) {
      await ensureRow();
      await db.authState.update("current", { tutorialStatus: status });
    },
    async clearLastLoginAt() {
      await ensureRow();
      await db.authState.update("current", { lastLoginAt: "" });
    },
  };
}
