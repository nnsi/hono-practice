import { v7 as uuidv7 } from "uuid";
import type { GoalRepository } from "@packages/domain/goal/goalRepository";
import { db, type DexieGoal } from "./schema";

type CreateGoalInput = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string | null;
  description?: string;
};

type UpdateGoalInput = Partial<
  Pick<
    DexieGoal,
    | "dailyTargetQuantity"
    | "startDate"
    | "endDate"
    | "isActive"
    | "description"
  >
>;

export const goalRepository = {
  async createGoal(input: CreateGoalInput) {
    const now = new Date().toISOString();
    const authState = await db.authState.get("current");
    const goal: DexieGoal = {
      id: uuidv7(),
      userId: authState?.userId ?? "",
      activityId: input.activityId,
      dailyTargetQuantity: input.dailyTargetQuantity,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      isActive: true,
      description: input.description ?? "",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending",
    };
    await db.goals.add(goal);
    return goal;
  },

  async getAllGoals() {
    return db.goals.filter((g) => !g.deletedAt).toArray();
  },

  async updateGoal(id: string, changes: UpdateGoalInput) {
    const now = new Date().toISOString();
    await db.goals.update(id, {
      ...changes,
      updatedAt: now,
      _syncStatus: "pending",
    });
  },

  async softDeleteGoal(id: string) {
    const now = new Date().toISOString();
    await db.goals.update(id, {
      deletedAt: now,
      updatedAt: now,
      _syncStatus: "pending",
    });
  },

  async getPendingSyncGoals() {
    return db.goals.where("_syncStatus").equals("pending").toArray();
  },

  async markGoalsSynced(ids: string[]) {
    if (ids.length === 0) return;
    await db.goals
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "synced" as const });
  },

  async markGoalsFailed(ids: string[]) {
    if (ids.length === 0) return;
    await db.goals
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "failed" as const });
  },

  async upsertGoalsFromServer(goals: Omit<DexieGoal, "_syncStatus">[]) {
    await db.goals.bulkPut(
      goals.map((g) => ({ ...g, _syncStatus: "synced" as const })),
    );
  },
} satisfies GoalRepository;
