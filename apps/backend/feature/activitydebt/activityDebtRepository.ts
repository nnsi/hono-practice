import {
  createActivityDebtEntity,
  type ActivityDebt,
  type ActivityDebtId,
  type UserId,
  type ActivityId,
} from "@backend/domain";
import { activityDebts } from "@infra/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type ActivityDebtRepository = {
  getByUserId(userId: UserId): Promise<ActivityDebt[]>;
  getByIdAndUserId(
    id: ActivityDebtId,
    userId: UserId,
  ): Promise<ActivityDebt | undefined>;
  getByActivityId(
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityDebt[]>;
  getActiveByActivityId(
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityDebt | undefined>;
  create(debt: ActivityDebt): Promise<ActivityDebt>;
  update(debt: ActivityDebt): Promise<ActivityDebt>;
  delete(debt: ActivityDebt): Promise<void>;
  withTx(tx: any): ActivityDebtRepository;
};

export function newActivityDebtRepository(
  db: QueryExecutor,
): ActivityDebtRepository {
  return {
    getByUserId: getByUserId(db),
    getByIdAndUserId: getByIdAndUserId(db),
    getByActivityId: getByActivityId(db),
    getActiveByActivityId: getActiveByActivityId(db),
    create: create(db),
    update: update(db),
    delete: deleteDebt(db),
    withTx: (tx) => newActivityDebtRepository(tx),
  };
}

function getByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<ActivityDebt[]> => {
    const rows = await db.query.activityDebts.findMany({
      where: and(
        eq(activityDebts.userId, userId),
        isNull(activityDebts.deletedAt),
      ),
      orderBy: (debts, { desc }) => [desc(debts.createdAt)],
    });

    return rows.map((row) =>
      createActivityDebtEntity({
        id: row.id,
        userId: row.userId,
        activityId: row.activityId,
        dailyTargetQuantity: row.dailyTargetQuantity,
        startDate: row.startDate || "",
        endDate: row.endDate,
        isActive: row.isActive,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        type: "persisted",
      }),
    );
  };
}

function getByIdAndUserId(db: QueryExecutor) {
  return async (
    id: ActivityDebtId,
    userId: UserId,
  ): Promise<ActivityDebt | undefined> => {
    const row = await db.query.activityDebts.findFirst({
      where: and(
        eq(activityDebts.id, id),
        eq(activityDebts.userId, userId),
        isNull(activityDebts.deletedAt),
      ),
    });

    if (!row) return undefined;

    return createActivityDebtEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      dailyTargetQuantity: row.dailyTargetQuantity,
      startDate: row.startDate || "",
      endDate: row.endDate,
      isActive: row.isActive,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: "persisted",
    });
  };
}

function getByActivityId(db: QueryExecutor) {
  return async (
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityDebt[]> => {
    const rows = await db.query.activityDebts.findMany({
      where: and(
        eq(activityDebts.userId, userId),
        eq(activityDebts.activityId, activityId),
        isNull(activityDebts.deletedAt),
      ),
      orderBy: (debts, { desc }) => [desc(debts.createdAt)],
    });

    return rows.map((row) =>
      createActivityDebtEntity({
        id: row.id,
        userId: row.userId,
        activityId: row.activityId,
        dailyTargetQuantity: row.dailyTargetQuantity,
        startDate: row.startDate || "",
        endDate: row.endDate,
        isActive: row.isActive,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        type: "persisted",
      }),
    );
  };
}

function getActiveByActivityId(db: QueryExecutor) {
  return async (
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityDebt | undefined> => {
    const row = await db.query.activityDebts.findFirst({
      where: and(
        eq(activityDebts.userId, userId),
        eq(activityDebts.activityId, activityId),
        eq(activityDebts.isActive, true),
        isNull(activityDebts.deletedAt),
      ),
      orderBy: (debts, { desc }) => [desc(debts.createdAt)],
    });

    if (!row) return undefined;

    return createActivityDebtEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      dailyTargetQuantity: row.dailyTargetQuantity,
      startDate: row.startDate || "",
      endDate: row.endDate,
      isActive: row.isActive,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: "persisted",
    });
  };
}

function create(db: QueryExecutor) {
  return async (debt: ActivityDebt): Promise<ActivityDebt> => {
    if (debt.type !== "new") {
      throw new Error("Cannot create persisted debt");
    }

    const [row] = await db
      .insert(activityDebts)
      .values({
        id: debt.id,
        userId: debt.userId,
        activityId: debt.activityId,
        dailyTargetQuantity: debt.dailyTargetQuantity,
        startDate: debt.startDate,
        endDate: debt.endDate,
        isActive: debt.isActive,
        description: debt.description,
      })
      .returning();

    return createActivityDebtEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      dailyTargetQuantity: row.dailyTargetQuantity,
      startDate: row.startDate || "",
      endDate: row.endDate,
      isActive: row.isActive,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: "persisted",
    });
  };
}

function update(db: QueryExecutor) {
  return async (debt: ActivityDebt): Promise<ActivityDebt> => {
    if (debt.type !== "persisted") {
      throw new Error("Cannot update non-persisted debt");
    }

    const [row] = await db
      .update(activityDebts)
      .set({
        dailyTargetQuantity: debt.dailyTargetQuantity,
        startDate: debt.startDate,
        endDate: debt.endDate,
        isActive: debt.isActive,
        description: debt.description,
        updatedAt: new Date(),
      })
      .where(eq(activityDebts.id, debt.id))
      .returning();

    return createActivityDebtEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      dailyTargetQuantity: row.dailyTargetQuantity,
      startDate: row.startDate || "",
      endDate: row.endDate,
      isActive: row.isActive,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: "persisted",
    });
  };
}

function deleteDebt(db: QueryExecutor) {
  return async (debt: ActivityDebt): Promise<void> => {
    if (debt.type !== "persisted") {
      throw new Error("Cannot delete non-persisted debt");
    }

    await db
      .update(activityDebts)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(activityDebts.id, debt.id));
  };
}
