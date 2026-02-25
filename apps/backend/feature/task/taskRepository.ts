import {
  type Task,
  type TaskId,
  TaskSchema,
  createTaskEntity,
} from "@packages/domain/task/taskSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { DomainValidateError } from "@packages/domain/errors";
import { ResourceNotFoundError } from "@backend/error";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { tasks } from "@infra/drizzle/schema";
import { and, asc, desc, eq, gt, gte, isNull, lte, not, or } from "drizzle-orm";

export type TaskRepository<T = any> = {
  getTasksByUserId: (userId: UserId, date?: string) => Promise<Task[]>;
  getArchivedTasksByUserId: (userId: UserId) => Promise<Task[]>;
  getTaskByUserIdAndTaskId: (
    userId: UserId,
    taskId: TaskId,
  ) => Promise<Task | undefined>;
  createTask: (task: Task) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task | undefined>;
  deleteTask: (task: Task) => Promise<void>;
  archiveTask: (userId: UserId, taskId: TaskId) => Promise<Task | undefined>;
  getTaskChangesAfter: (
    userId: UserId,
    timestamp: Date,
    limit?: number,
  ) => Promise<{ tasks: Task[]; hasMore: boolean }>;
  withTx: (tx: T) => TaskRepository<T>;
};

export function newTaskRepository(
  db: QueryExecutor,
): TaskRepository<QueryExecutor> {
  return {
    getTasksByUserId: getTasksByUserId(db),
    getArchivedTasksByUserId: getArchivedTasksByUserId(db),
    getTaskByUserIdAndTaskId: getTaskByUserIdAndTaskId(db),
    createTask: createTask(db),
    updateTask: updateTask(db),
    deleteTask: deleteTask(db),
    archiveTask: archiveTask(db),
    getTaskChangesAfter: getTaskChangesAfter(db),
    withTx: (tx) => newTaskRepository(tx),
  };
}

function getTasksByUserId(db: QueryExecutor) {
  return async (userId: UserId, date?: string) => {
    let whereClause: any;
    if (date) {
      whereClause = and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.archivedAt),
        // 完了済み: 完了日と一致
        or(
          and(
            // doneDateがnullでない場合
            not(isNull(tasks.doneDate)),
            eq(tasks.doneDate, date),
          ),
          // 未完了: 期間内 or 期間指定なし
          and(
            isNull(tasks.doneDate),
            or(
              // startDate/dueDateがnullなら全日表示
              and(isNull(tasks.startDate), isNull(tasks.dueDate)),
              // startDateのみnull
              and(isNull(tasks.startDate), gte(tasks.dueDate, date)),
              // dueDateのみnull
              and(lte(tasks.startDate, date), isNull(tasks.dueDate)),
              // 両方設定あり
              and(lte(tasks.startDate, date), gte(tasks.dueDate, date)),
            ),
          ),
        ),
      );
    } else {
      whereClause = and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.archivedAt),
      );
    }
    const result = await db.query.tasks.findMany({
      where: whereClause,
      orderBy: desc(tasks.createdAt),
    });

    return result.map((r) => {
      const task = createTaskEntity({ ...r, type: "persisted" });
      return task;
    });
  };
}

function getArchivedTasksByUserId(db: QueryExecutor) {
  return async (userId: UserId) => {
    const result = await db.query.tasks.findMany({
      where: and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        not(isNull(tasks.archivedAt)),
      ),
      orderBy: desc(tasks.archivedAt),
    });

    return result.map((r) => {
      // アーカイブ済みタスクは必ず完了済みである
      if (!r.doneDate || !r.archivedAt) {
        throw new DomainValidateError(
          "getArchivedTasksByUserId: archived task must have doneDate and archivedAt",
        );
      }
      const task = createTaskEntity({
        ...r,
        type: "archived",
        doneDate: r.doneDate,
        archivedAt: r.archivedAt,
      });
      return task;
    });
  };
}

function getTaskByUserIdAndTaskId(db: QueryExecutor) {
  return async (userId: UserId, taskId: TaskId) => {
    const result = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.archivedAt),
      ),
    });

    if (!result) {
      return undefined;
    }

    const task = createTaskEntity({ ...result, type: "persisted" });

    return task;
  };
}

function createTask(db: QueryExecutor) {
  return async (task: Task) => {
    const [result] = await db.insert(tasks).values(task).returning();

    const persistedTask = TaskSchema.safeParse({
      ...result,
      type: "persisted",
    });
    if (!persistedTask.success) {
      throw new DomainValidateError("createTask: failed to parse task");
    }

    return persistedTask.data;
  };
}

function updateTask(db: QueryExecutor) {
  return async (task: Task) => {
    const [result] = await db
      .update(tasks)
      .set({
        title: task.title,
        startDate: task.startDate,
        dueDate: task.dueDate,
        doneDate: task.doneDate,
        memo: task.memo,
        archivedAt: task.archivedAt,
      })
      .where(and(eq(tasks.id, task.id), eq(tasks.userId, task.userId)))
      .returning();

    if (!result) {
      return undefined;
    }

    const updateTask = createTaskEntity({ ...result, type: "persisted" });

    return updateTask;
  };
}

function deleteTask(db: QueryExecutor) {
  return async (task: Task) => {
    const [result] = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, task.id), eq(tasks.userId, task.userId)))
      .returning();

    if (!result) {
      throw new ResourceNotFoundError("task not found");
    }
  };
}

function archiveTask(db: QueryExecutor) {
  return async (userId: UserId, taskId: TaskId) => {
    // アーカイブ前にタスクの状態を確認
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
      ),
    });

    if (!task) {
      return undefined;
    }

    // アーカイブするタスクは必ず完了済みでなければならない
    // （この検証はcreateTaskEntityで行われるが、早期チェックのため残す）
    if (!task.doneDate) {
      throw new DomainValidateError(
        "archiveTask: task must be completed before archiving",
      );
    }

    const [result] = await db
      .update(tasks)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
        ),
      )
      .returning();

    if (!result) {
      return undefined;
    }

    // アーカイブ処理の結果は必ず完了済みでアーカイブ日が設定されている
    if (!result.doneDate || !result.archivedAt) {
      throw new DomainValidateError(
        "archiveTask: result must have doneDate and archivedAt",
      );
    }

    const archivedTask = createTaskEntity({
      ...result,
      type: "archived",
      doneDate: result.doneDate,
      archivedAt: result.archivedAt,
    });

    return archivedTask;
  };
}

function getTaskChangesAfter(db: QueryExecutor) {
  return async (
    userId: UserId,
    timestamp: Date,
    limit = 100,
  ): Promise<{ tasks: Task[]; hasMore: boolean }> => {
    const rows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), gt(tasks.updatedAt, timestamp)))
      .orderBy(asc(tasks.updatedAt))
      .limit(limit + 1); // +1 to check if there are more

    const hasMore = rows.length > limit;
    const tasksData = rows.slice(0, limit);

    const result = tasksData.map((row) => {
      if (row.archivedAt && row.doneDate) {
        return createTaskEntity({
          type: "archived",
          id: row.id,
          userId: row.userId,
          title: row.title,
          memo: row.memo || "",
          startDate: row.startDate || undefined,
          dueDate: row.dueDate || undefined,
          doneDate: row.doneDate,
          archivedAt: row.archivedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }
      return createTaskEntity({
        type: "persisted",
        id: row.id,
        userId: row.userId,
        title: row.title,
        memo: row.memo || "",
        startDate: row.startDate || undefined,
        dueDate: row.dueDate || undefined,
        doneDate: row.doneDate || undefined,
        archivedAt: row.archivedAt || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });

    return {
      tasks: result,
      hasMore,
    };
  };
}
