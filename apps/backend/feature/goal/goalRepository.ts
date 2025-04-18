import {
  type Goal,
  GoalFactory,
  type GoalId,
  type UserId,
  createGoalId,
} from "@backend/domain";
import dayjs from "@backend/lib/dayjs";
import { goals } from "@infra/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";


import type { QueryExecutor } from "@backend/infra/drizzle";

export type GoalRepository = {
  getGoalsByUserId(userId: UserId): Promise<Goal[]>;
  getGoalByIdAndUserId(id: GoalId, userId: UserId): Promise<Goal | undefined>;
  createGoal: (goal: Goal) => Promise<Goal>;
  updateGoal: (goal: Goal) => Promise<Goal>;
  deleteGoal: (goal: Goal) => Promise<void>;
  withTx: (tx: QueryExecutor) => GoalRepository;
};

export function newGoalRepository(db: QueryExecutor): GoalRepository {
  return {
    getGoalsByUserId: getGoalsByUserId(db),
    getGoalByIdAndUserId: getGoalByIdAndUserId(db),
    createGoal: createGoal(db),
    updateGoal: updateGoal(db),
    deleteGoal: deleteGoal(db),
    withTx: (tx) => newGoalRepository(tx),
  };
}

function getGoalsByUserId(db: QueryExecutor) {
  return async (userId: UserId) => {
    const rows = await db.query.goals.findMany({
      where: and(eq(goals.userId, userId), isNull(goals.deletedAt)),
    });

    return rows.map((r) => {
      const id = createGoalId(r.id);
      const parentGoalId = r.parentGoalId ? createGoalId(r.parentGoalId) : null;
      const startDate = r.startDate ? dayjs(r.startDate).toDate() : null;
      const dueDate = r.dueDate ? dayjs(r.dueDate).toDate() : null;

      return GoalFactory.create({
        ...r,
        id,
        userId,
        parentGoalId,
        startDate,
        dueDate,
      });
    });
  };
}

function getGoalByIdAndUserId(db: QueryExecutor) {
  return async (id: GoalId, userId: UserId) => {
    const row = await db.query.goals.findFirst({
      where: and(eq(goals.id, id), eq(goals.userId, userId)),
    });

    if (!row) return undefined;

    const parentGoalId = row.parentGoalId
      ? createGoalId(row.parentGoalId)
      : null;
    const startDate = row.startDate ? dayjs(row.startDate).toDate() : null;
    const dueDate = row.dueDate ? dayjs(row.dueDate).toDate() : null;

    return GoalFactory.create({
      ...row,
      id,
      userId,
      parentGoalId,
      startDate,
      dueDate,
    });
  };
}

function createGoal(db: QueryExecutor) {
  return async (goal: Goal) => {
    const [row] = await db
      .insert(goals)
      .values({
        ...goal,
        startDate: dayjs(goal.startDate).format("YYYY-MM-DD"),
        dueDate: dayjs(goal.dueDate).format("YYYY-MM-DD"),
      })
      .returning();

    return GoalFactory.create({
      ...row,
      id: createGoalId(row.id),
      userId: goal.userId,
      parentGoalId: goal.parentGoalId,
      startDate: goal.startDate,
      dueDate: goal.dueDate,
    });
  };
}

function updateGoal(db: QueryExecutor) {
  return async (goal: Goal) => {
    const [row] = await db
      .update(goals)
      .set({
        ...goal,
        startDate: dayjs(goal.startDate).format("YYYY-MM-DD"),
        dueDate: dayjs(goal.dueDate).format("YYYY-MM-DD"),
      })
      .where(and(eq(goals.id, goal.id), eq(goals.userId, goal.userId)))
      .returning();

    return GoalFactory.create({
      ...row,
      id: createGoalId(row.id),
      userId: goal.userId,
      parentGoalId: goal.parentGoalId,
      startDate: goal.startDate,
      dueDate: goal.dueDate,
    });
  };
}

function deleteGoal(db: QueryExecutor) {
  return async (goal: Goal) => {
    const id = goal.id;

    await db
      .update(goals)
      .set({ deletedAt: new Date() })
      .where(eq(goals.id, id))
      .execute();
  };
}
