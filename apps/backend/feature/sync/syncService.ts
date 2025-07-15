import { createTaskEntity } from "@backend/domain/task";
import { UnexpectedError } from "@backend/error";

import type { SyncItem } from "@dtos/request";
import type { SyncResult } from "@dtos/response";

import type { ActivityRepository } from "../activity/activityRepository";
import type { ActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import type { ActivityLogRepository } from "../activityLog/activityLogRepository";
import type { TaskRepository } from "../task/taskRepository";
import type {
  Activity,
  ActivityGoal,
  ActivityLog,
  ActivityLogId,
  Task,
  UserId,
} from "@backend/domain";
import type { SyncQueueEntity } from "@backend/domain/sync/syncQueue";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type ConflictResolutionStrategy =
  | "client-wins"
  | "server-wins"
  | "timestamp";

export type ConflictResolver = {
  resolve(
    clientData: any,
    serverData: any,
    strategy: ConflictResolutionStrategy,
  ): any;
};

export type SyncService = {
  syncEntity(item: SyncQueueEntity): Promise<void>;
  syncBatchItems(
    userId: string,
    items: SyncItem[],
    strategy?: ConflictResolutionStrategy,
  ): Promise<SyncResult[]>;
  detectConflict(clientData: any, serverData: any): boolean;
};

export function newSyncService(
  db: QueryExecutor,
  activityRepository: ActivityRepository,
  activityLogRepository: ActivityLogRepository,
  activityGoalRepository: ActivityGoalRepository,
  taskRepository: TaskRepository,
): SyncService {
  return {
    syncEntity: syncEntity(
      activityRepository,
      activityLogRepository,
      activityGoalRepository,
      taskRepository,
    ),
    syncBatchItems: syncBatchItems(
      db,
      activityRepository,
      activityLogRepository,
      activityGoalRepository,
      taskRepository,
    ),
    detectConflict: detectConflict(),
  };
}

function syncEntity(
  activityRepository: ActivityRepository,
  activityLogRepository: ActivityLogRepository,
  activityGoalRepository: ActivityGoalRepository,
  taskRepository: TaskRepository,
) {
  return async (item: SyncQueueEntity): Promise<void> => {
    switch (item.entityType) {
      case "activity":
        return syncActivity(activityRepository)(item);
      case "activityLog":
        return syncActivityLog(activityLogRepository)(item);
      case "goal":
        return syncGoal(activityGoalRepository)(item);
      case "task":
        return syncTask(taskRepository)(item);
      default:
        throw new UnexpectedError(
          `不明なエンティティタイプです: ${item.entityType}`,
        );
    }
  };
}

function syncActivity(activityRepository: ActivityRepository) {
  return async (item: SyncQueueEntity): Promise<void> => {
    const activity = item.payload as Activity;

    switch (item.operation) {
      case "create":
        await activityRepository.createActivity(activity);
        break;
      case "update":
        await activityRepository.updateActivity(activity);
        break;
      case "delete":
        await activityRepository.deleteActivity(activity);
        break;
      default:
        throw new UnexpectedError(`不明な操作です: ${item.operation}`);
    }
  };
}

function syncActivityLog(activityLogRepository: ActivityLogRepository) {
  return async (item: SyncQueueEntity): Promise<void> => {
    const activityLog = item.payload as ActivityLog;

    switch (item.operation) {
      case "create":
        await activityLogRepository.createActivityLog(activityLog);
        break;
      case "update":
        await activityLogRepository.updateActivityLog(activityLog);
        break;
      case "delete":
        await activityLogRepository.deleteActivityLog(activityLog);
        break;
      default:
        throw new UnexpectedError(`不明な操作です: ${item.operation}`);
    }
  };
}

function syncGoal(activityGoalRepository: ActivityGoalRepository) {
  return async (item: SyncQueueEntity): Promise<void> => {
    const goal = item.payload as ActivityGoal;

    switch (item.operation) {
      case "create":
        await activityGoalRepository.createActivityGoal(goal);
        break;
      case "update":
        await activityGoalRepository.updateActivityGoal(goal);
        break;
      case "delete":
        await activityGoalRepository.deleteActivityGoal(goal);
        break;
      default:
        throw new UnexpectedError(`不明な操作です: ${item.operation}`);
    }
  };
}

function syncTask(taskRepository: TaskRepository) {
  return async (item: SyncQueueEntity): Promise<void> => {
    const task = item.payload as Task;

    switch (item.operation) {
      case "create":
        await taskRepository.createTask(task);
        break;
      case "update":
        await taskRepository.updateTask(task);
        break;
      case "delete":
        await taskRepository.deleteTask(task);
        break;
      default:
        throw new UnexpectedError(`不明な操作です: ${item.operation}`);
    }
  };
}

/**
 * エンティティタイプの処理順序を定義（依存関係を考慮）
 *
 * 処理順序：
 * 1. activity - 基本となるエンティティ（ActivityKindも同時に処理）
 * 2. activityKind - Activityに含まれるため実際には処理されない
 * 3. activityLog - Activityに依存
 * 4. task - 独立したエンティティ
 * 5. goal - 独立したエンティティ
 *
 * この順序により、ActivityLogを作成する前にActivityが存在することが保証される
 */
const ENTITY_PROCESSING_ORDER = [
  "activity",
  "activityKind", // ActivityはActivityKindを内包するので同時に処理
  "activityLog",
  "task",
  "goal",
];

/**
 * バッチ同期処理
 *
 * 主な機能：
 * 1. 依存関係の順序保証 - エンティティタイプごとに定義された順序で処理
 * 2. 冪等性の保証 - 同じ操作を複数回実行しても安全
 * 3. トランザクション管理 - エンティティタイプごとにトランザクションで処理
 * 4. コンフリクト解決 - 更新時のコンフリクトを検出し解決戦略に従って解決
 *
 * 冪等性の実装：
 * - CREATE: 既存チェックを行い、存在する場合はスキップ
 * - UPDATE: 存在チェックを行い、存在しない場合はエラー
 * - DELETE: 既に削除されている場合はスキップ
 */
function syncBatchItems(
  db: QueryExecutor,
  activityRepository: ActivityRepository,
  activityLogRepository: ActivityLogRepository,
  activityGoalRepository: ActivityGoalRepository,
  taskRepository: TaskRepository,
) {
  return async (
    userId: string,
    items: SyncItem[],
    strategy: ConflictResolutionStrategy = "timestamp",
  ): Promise<SyncResult[]> => {
    const results: SyncResult[] = [];
    const conflictResolver = createConflictResolver();

    // エンティティタイプごとにグループ化
    const groupedItems = new Map<string, SyncItem[]>();
    for (const item of items) {
      const group = groupedItems.get(item.entityType) || [];
      group.push(item);
      groupedItems.set(item.entityType, group);
    }

    // 定義された順序で処理
    for (const entityType of ENTITY_PROCESSING_ORDER) {
      const entityItems = groupedItems.get(entityType);
      if (!entityItems || entityItems.length === 0) continue;

      // エンティティタイプごとにトランザクションで処理
      await db.transaction(async (tx: QueryExecutor) => {
        for (const item of entityItems) {
          try {
            const result: SyncResult = {
              clientId: item.clientId,
              status: "success",
            };

            switch (item.entityType) {
              case "activity": {
                const activity = item.payload as Activity;

                // 冪等性の保証：既存チェック
                const existing = await activityRepository
                  .withTx(tx)
                  .getActivityByIdAndUserId(activity.userId, activity.id);

                if (item.operation === "create") {
                  if (existing) {
                    // 既に存在する場合はスキップ（冪等性）
                    result.status = "skipped";
                    result.message = "既に存在するため、作成をスキップしました";
                    result.serverId = existing.id;
                    result.payload = existing as unknown as Record<
                      string,
                      unknown
                    >;
                    break;
                  }
                  const created = await activityRepository
                    .withTx(tx)
                    .createActivity(activity);
                  result.serverId = created.id;
                  result.payload = created as unknown as Record<
                    string,
                    unknown
                  >;
                  break;
                }

                if (item.operation === "update") {
                  if (!existing) {
                    throw new UnexpectedError(
                      "更新対象のActivityが存在しません",
                    );
                  }
                  if (detectConflict()(activity, existing)) {
                    const resolved = conflictResolver.resolve(
                      activity,
                      existing,
                      strategy,
                    );
                    const updated = await activityRepository
                      .withTx(tx)
                      .updateActivity(resolved);
                    result.status = "conflict";
                    result.conflictData = existing;
                    result.payload = updated as unknown as Record<
                      string,
                      unknown
                    >;
                    break;
                  }
                  const updated = await activityRepository
                    .withTx(tx)
                    .updateActivity(activity);
                  result.payload = updated as unknown as Record<
                    string,
                    unknown
                  >;
                  break;
                }

                if (item.operation === "delete") {
                  if (!existing) {
                    // 既に削除されている場合はスキップ（冪等性）
                    result.status = "skipped";
                    result.message =
                      "既に削除されているため、削除をスキップしました";
                    break;
                  }
                  await activityRepository.withTx(tx).deleteActivity(activity);
                }
                break;
              }
              case "activityLog": {
                const activityLogPayload = item.payload as any;

                // 削除操作の場合は早期処理
                if (item.operation === "delete") {
                  const existing = await activityLogRepository
                    .withTx(tx)
                    .getActivityLogByIdAndUserId(
                      userId as UserId,
                      item.entityId as ActivityLogId,
                    );

                  if (!existing) {
                    result.status = "skipped";
                    result.message =
                      "既に削除されているため、削除をスキップしました";
                    break;
                  }
                  await activityLogRepository
                    .withTx(tx)
                    .deleteActivityLog(existing);
                  result.serverId = existing.id;
                  break;
                }

                // CREATE/UPDATE操作の場合
                // payloadから必要な情報を取得
                const activityId = activityLogPayload.activityId;

                if (!activityId) {
                  throw new UnexpectedError(
                    "ActivityLogのactivityIdが指定されていません",
                  );
                }

                // 依存関係チェック：Activityが存在するか確認
                const activityExists = await activityRepository
                  .withTx(tx)
                  .getActivityByIdAndUserId(userId as UserId, activityId);

                if (!activityExists) {
                  throw new UnexpectedError("関連するActivityが存在しません");
                }

                // activityLogオブジェクトを作成
                const activityLog: ActivityLog = {
                  id: item.entityId as ActivityLogId,
                  userId: userId as UserId,
                  date: activityLogPayload.date,
                  quantity: activityLogPayload.quantity,
                  memo: activityLogPayload.memo || "",
                  activity: activityExists,
                  activityKind: activityLogPayload.activityKindId
                    ? activityExists.kinds?.find(
                        (k) => k.id === activityLogPayload.activityKindId,
                      ) || null
                    : null,
                  type: "new",
                };

                // 冪等性の保証：既存チェック
                const existing = await activityLogRepository
                  .withTx(tx)
                  .getActivityLogByIdAndUserId(
                    activityLog.userId,
                    activityLog.id,
                  );

                if (item.operation === "create") {
                  if (existing) {
                    result.status = "skipped";
                    result.message = "既に存在するため、作成をスキップしました";
                    result.serverId = existing.id;
                    result.payload = existing as unknown as Record<
                      string,
                      unknown
                    >;
                    break;
                  }
                  const created = await activityLogRepository
                    .withTx(tx)
                    .createActivityLog(activityLog);
                  result.serverId = created.id;
                  result.payload = created as unknown as Record<
                    string,
                    unknown
                  >;
                  break;
                }

                if (item.operation === "update") {
                  if (!existing) {
                    throw new UnexpectedError(
                      "更新対象のActivityLogが存在しません",
                    );
                  }
                  if (detectConflict()(activityLog, existing)) {
                    const resolved = conflictResolver.resolve(
                      activityLog,
                      existing,
                      strategy,
                    );
                    const updated = await activityLogRepository
                      .withTx(tx)
                      .updateActivityLog(resolved);
                    result.status = "conflict";
                    result.conflictData = existing;
                    result.payload = updated as unknown as Record<
                      string,
                      unknown
                    >;
                    break;
                  }
                  const updated = await activityLogRepository
                    .withTx(tx)
                    .updateActivityLog(activityLog);
                  result.payload = updated as unknown as Record<
                    string,
                    unknown
                  >;
                }
                break;
              }
              case "goal": {
                const goal = item.payload as ActivityGoal;

                // 冪等性の保証：既存チェック
                const existing = await activityGoalRepository
                  .withTx(tx)
                  .getActivityGoalByIdAndUserId(goal.id, goal.userId);

                if (item.operation === "create") {
                  if (existing) {
                    result.status = "skipped";
                    result.message = "既に存在するため、作成をスキップしました";
                    result.serverId = existing.id;
                    result.payload = existing as unknown as Record<
                      string,
                      unknown
                    >;
                    break;
                  }
                  const created = await activityGoalRepository
                    .withTx(tx)
                    .createActivityGoal(goal);
                  result.serverId = created.id;
                  result.payload = created as unknown as Record<
                    string,
                    unknown
                  >;
                  break;
                }

                if (item.operation === "update") {
                  if (!existing) {
                    throw new UnexpectedError("更新対象のGoalが存在しません");
                  }
                  if (detectConflict()(goal, existing)) {
                    const resolved = conflictResolver.resolve(
                      goal,
                      existing,
                      strategy,
                    );
                    const updated = await activityGoalRepository
                      .withTx(tx)
                      .updateActivityGoal(resolved);
                    result.status = "conflict";
                    result.conflictData = existing;
                    result.payload = updated as unknown as Record<
                      string,
                      unknown
                    >;
                    break;
                  }
                  const updated = await activityGoalRepository
                    .withTx(tx)
                    .updateActivityGoal(goal);
                  result.payload = updated as unknown as Record<
                    string,
                    unknown
                  >;
                  break;
                }

                if (item.operation === "delete") {
                  if (!existing) {
                    result.status = "skipped";
                    result.message =
                      "既に削除されているため、削除をスキップしました";
                    break;
                  }
                  await activityGoalRepository
                    .withTx(tx)
                    .deleteActivityGoal(goal);
                }
                break;
              }
              case "task": {
                const taskPayload = item.payload as any;
                let task: Task;

                try {
                  // payloadのログを出力して問題を特定
                  console.log("Task sync payload:", {
                    clientId: item.clientId,
                    payload: taskPayload,
                    userId: taskPayload.userId || userId,
                  });

                  // userIdが"offline"の場合は実際のユーザーIDを使用
                  const actualUserId =
                    taskPayload.userId === "offline" || !taskPayload.userId
                      ? userId
                      : taskPayload.userId;

                  // payloadにtype フィールドが無い場合は追加する
                  // memoフィールドが無い場合はnullを設定
                  // archivedAtフィールドが無い場合はnullを設定
                  // createdAt/updatedAtがstring型の場合はDateに変換
                  task = createTaskEntity({
                    ...taskPayload,
                    type: taskPayload.type || "new",
                    userId: actualUserId,
                    memo:
                      taskPayload.memo !== undefined ? taskPayload.memo : null,
                    archivedAt:
                      taskPayload.archivedAt !== undefined
                        ? taskPayload.archivedAt
                        : null,
                    createdAt: taskPayload.createdAt
                      ? new Date(taskPayload.createdAt)
                      : undefined,
                    updatedAt: taskPayload.updatedAt
                      ? new Date(taskPayload.updatedAt)
                      : undefined,
                  });

                  console.log("Processing task sync:", {
                    clientId: item.clientId,
                    taskId: task.id,
                    operation: item.operation,
                  });
                } catch (createError) {
                  console.error("Failed to create task entity:", {
                    clientId: item.clientId,
                    payload: taskPayload,
                    actualPayload: {
                      ...taskPayload,
                      type: taskPayload.type || "new",
                      userId:
                        taskPayload.userId === "offline" || !taskPayload.userId
                          ? userId
                          : taskPayload.userId,
                    },
                    error: createError,
                    errorMessage:
                      createError instanceof Error
                        ? createError.message
                        : "Unknown error",
                    errorStack:
                      createError instanceof Error
                        ? createError.stack
                        : undefined,
                  });
                  throw new UnexpectedError(
                    `タスクエンティティの作成に失敗しました: ${createError instanceof Error ? createError.message : "Unknown error"}`,
                  );
                }

                // 冪等性の保証：既存チェック
                const existing = await taskRepository
                  .withTx(tx)
                  .getTaskByUserIdAndTaskId(task.userId, task.id);

                if (item.operation === "create") {
                  if (existing) {
                    result.status = "skipped";
                    result.message = "既に存在するため、作成をスキップしました";
                    result.serverId = existing.id;
                    result.payload = existing as unknown as Record<
                      string,
                      unknown
                    >;
                    break;
                  }
                  const created = await taskRepository
                    .withTx(tx)
                    .createTask(task);
                  result.serverId = created.id;
                  result.payload = created as unknown as Record<
                    string,
                    unknown
                  >;
                  break;
                }

                if (item.operation === "update") {
                  if (!existing) {
                    throw new UnexpectedError("更新対象のTaskが存在しません");
                  }
                  if (detectConflict()(task, existing)) {
                    const resolved = conflictResolver.resolve(
                      task,
                      existing,
                      strategy,
                    );
                    const updated = await taskRepository
                      .withTx(tx)
                      .updateTask(resolved);
                    result.status = "conflict";
                    result.conflictData = existing;
                    result.payload = updated as unknown as Record<
                      string,
                      unknown
                    >;
                    break;
                  }
                  const updated = await taskRepository
                    .withTx(tx)
                    .updateTask(task);
                  result.payload = updated as unknown as Record<
                    string,
                    unknown
                  >;
                  break;
                }

                if (item.operation === "delete") {
                  if (!existing) {
                    result.status = "skipped";
                    result.message =
                      "既に削除されているため、削除をスキップしました";
                    break;
                  }
                  await taskRepository.withTx(tx).deleteTask(task);
                }
                break;
              }
              default:
                throw new UnexpectedError(
                  `不明なエンティティタイプです: ${item.entityType}`,
                );
            }

            results.push(result);
          } catch (error) {
            results.push({
              clientId: item.clientId,
              status: "error",
              error: error instanceof Error ? error.message : "同期エラー",
            });
          }
        }
      });
    }

    return results;
  };
}

// 型ガード関数
function hasUpdatedAt(
  entity: any,
): entity is { updatedAt: Date; [key: string]: any } {
  return entity && entity.type === "persisted" && "updatedAt" in entity;
}

function detectConflict() {
  return (clientData: any, serverData: any): boolean => {
    // persistedタイプでない場合は競合なし
    if (!hasUpdatedAt(clientData) || !hasUpdatedAt(serverData)) {
      return false;
    }

    // バージョン番号による競合検出
    if (clientData.version !== undefined && serverData.version !== undefined) {
      return clientData.version < serverData.version;
    }

    // タイムスタンプによる競合検出
    const clientTime = new Date(clientData.updatedAt).getTime();
    const serverTime = new Date(serverData.updatedAt).getTime();
    return clientTime < serverTime;
  };
}

function createConflictResolver(): ConflictResolver {
  return {
    resolve(
      clientData: any,
      serverData: any,
      strategy: ConflictResolutionStrategy,
    ): any {
      switch (strategy) {
        case "client-wins":
          return clientData;
        case "server-wins":
          return serverData;
        case "timestamp": {
          // 型ガードを使用して安全にアクセス
          const clientTime = hasUpdatedAt(clientData)
            ? new Date(clientData.updatedAt).getTime()
            : 0;
          const serverTime = hasUpdatedAt(serverData)
            ? new Date(serverData.updatedAt).getTime()
            : 0;
          return clientTime >= serverTime ? clientData : serverData;
        }
        default:
          throw new UnexpectedError(`不明な競合解決戦略です: ${strategy}`);
      }
    },
  };
}
