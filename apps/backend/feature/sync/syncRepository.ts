import {
  checkForDuplicates,
  createSyncMetadataEntity,
  createSyncQueueEntity,
  sortBySequence,
} from "@backend/domain/sync";
import { UnexpectedError } from "@backend/error";
import { syncMetadata, syncQueue } from "@infra/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

import type {
  DuplicateCheckResult,
  SyncMetadataEntity,
  SyncMetadataId,
  SyncQueueBatch,
  SyncQueueEntity,
  SyncQueueId,
} from "@backend/domain/sync";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle/drizzleInstance";

export type SyncRepository<T = unknown> = {
  findDuplicatesByTimestamps(
    userId: string,
    operations: Array<{
      entityType: string;
      entityId: string;
      timestamp: Date;
      operation: "create" | "update" | "delete";
    }>
  ): Promise<DuplicateCheckResult[]>;
  getSyncStatus(userId: string): Promise<{
    pendingCount: number;
    syncingCount: number;
    syncedCount: number;
    failedCount: number;
    lastSyncedAt: Date | null;
  }>;
  enqueueSync(
    operations: Array<{
      userId: string;
      entityType: string;
      entityId: string;
      operation: "create" | "update" | "delete";
      payload: Record<string, any>;
      timestamp: Date;
      sequenceNumber: number;
    }>
  ): Promise<SyncQueueEntity[]>;
  dequeueSyncBatch(
    userId: string,
    batchSize?: number
  ): Promise<SyncQueueBatch>;
  markAsSynced(queueIds: SyncQueueId[]): Promise<void>;
  getMetadataByEntity(
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<SyncMetadataEntity | null>;
  updateSyncMetadata(
    metadataId: SyncMetadataId,
    updates: Partial<{
      status: "pending" | "syncing" | "synced" | "failed";
      lastSyncedAt: Date | null;
      errorMessage: string | null;
      retryCount: number;
    }>
  ): Promise<void>;
  getQueueByIds(queueIds: SyncQueueId[]): Promise<SyncQueueEntity[]>;
  deleteQueueItems(queueIds: SyncQueueId[]): Promise<void>;
  withTx(tx: T): SyncRepository<T>;
};

export function newSyncRepository(db: QueryExecutor): SyncRepository {
  return {
    findDuplicatesByTimestamps: findDuplicatesByTimestamps(db),
    getSyncStatus: getSyncStatus(db),
    enqueueSync: enqueueSync(db),
    dequeueSyncBatch: dequeueSyncBatch(db),
    markAsSynced: markAsSynced(db),
    getMetadataByEntity: getMetadataByEntity(db),
    updateSyncMetadata: updateSyncMetadata(db),
    getQueueByIds: getQueueByIds(db),
    deleteQueueItems: deleteQueueItems(db),
    withTx: (tx) => newSyncRepository(tx),
  };
}

function findDuplicatesByTimestamps(db: QueryExecutor) {
  return async (
    userId: string,
    operations: Array<{
      entityType: string;
      entityId: string;
      timestamp: Date;
      operation: "create" | "update" | "delete";
    }>
  ): Promise<DuplicateCheckResult[]> => {
    try {
      // バッチで既存の操作を取得
      const existingOps = await db
        .select()
        .from(syncQueue)
        .where(eq(syncQueue.userId, userId));

      const existingEntities = existingOps.map((row) =>
        createSyncQueueEntity({
          id: row.id,
          userId: row.userId,
          entityType: row.entityType,
          entityId: row.entityId,
          operation: row.operation as "create" | "update" | "delete",
          payload: JSON.parse(row.payload),
          timestamp: row.timestamp,
          sequenceNumber: Number(row.sequenceNumber),
          createdAt: row.createdAt,
        })
      );

      // 各操作について重複チェック
      return operations.map((op) => checkForDuplicates(op, existingEntities));
    } catch (error) {
      throw new UnexpectedError("重複チェックに失敗しました", error as Error);
    }
  };
}

function getSyncStatus(db: QueryExecutor) {
  return async (userId: string): Promise<{
    pendingCount: number;
    syncingCount: number;
    syncedCount: number;
    failedCount: number;
    lastSyncedAt: Date | null;
  }> => {
    try {
      const metadataRows = await db
        .select()
        .from(syncMetadata)
        .where(eq(syncMetadata.userId, userId));

      const status = {
        pendingCount: 0,
        syncingCount: 0,
        syncedCount: 0,
        failedCount: 0,
        lastSyncedAt: null as Date | null,
      };

      for (const row of metadataRows) {
        switch (row.status) {
          case "pending":
            status.pendingCount++;
            break;
          case "syncing":
            status.syncingCount++;
            break;
          case "synced":
            status.syncedCount++;
            if (
              row.lastSyncedAt &&
              (!status.lastSyncedAt || row.lastSyncedAt > status.lastSyncedAt)
            ) {
              status.lastSyncedAt = row.lastSyncedAt;
            }
            break;
          case "failed":
            status.failedCount++;
            break;
        }
      }

      return status;
    } catch (error) {
      throw new UnexpectedError("同期状況の取得に失敗しました", error as Error);
    }
  };
}

function enqueueSync(db: QueryExecutor) {
  return async (
    operations: Array<{
      userId: string;
      entityType: string;
      entityId: string;
      operation: "create" | "update" | "delete";
      payload: Record<string, any>;
      timestamp: Date;
      sequenceNumber: number;
    }>
  ): Promise<SyncQueueEntity[]> => {
    try {
      const entities = await db.transaction(async (tx) => {
        const createdEntities: SyncQueueEntity[] = [];

        for (const op of operations) {
          const id = crypto.randomUUID();
          const entity = createSyncQueueEntity({
            id,
            ...op,
          });

          await tx.insert(syncQueue).values({
            id,
            userId: op.userId,
            entityType: op.entityType,
            entityId: op.entityId,
            operation: op.operation,
            payload: JSON.stringify(op.payload),
            timestamp: op.timestamp,
            sequenceNumber: op.sequenceNumber,
          });

          createdEntities.push(entity);
        }

        return createdEntities;
      });

      return entities;
    } catch (error) {
      throw new UnexpectedError("同期キューへの追加に失敗しました", error as Error);
    }
  };
}

function dequeueSyncBatch(db: QueryExecutor) {
  return async (
    userId: string,
    batchSize = 50
  ): Promise<SyncQueueBatch> => {
    try {
      const rows = await db
        .select()
        .from(syncQueue)
        .where(eq(syncQueue.userId, userId))
        .limit(batchSize + 1); // +1 to check if there are more

      const hasMore = rows.length > batchSize;
      const items = rows.slice(0, batchSize).map((row) =>
        createSyncQueueEntity({
          id: row.id,
          userId: row.userId,
          entityType: row.entityType,
          entityId: row.entityId,
          operation: row.operation as "create" | "update" | "delete",
          payload: JSON.parse(row.payload),
          timestamp: row.timestamp,
          sequenceNumber: Number(row.sequenceNumber),
          createdAt: row.createdAt,
        })
      );

      return {
        items: sortBySequence(items),
        totalCount: items.length,
        hasMore,
      };
    } catch (error) {
      throw new UnexpectedError("同期キューの取得に失敗しました", error as Error);
    }
  };
}

function markAsSynced(db: QueryExecutor) {
  return async (queueIds: SyncQueueId[]): Promise<void> => {
    try {
      await db.transaction(async (tx) => {
        // キューから削除
        if (queueIds.length > 0) {
          await tx.delete(syncQueue).where(inArray(syncQueue.id, queueIds));
        }

        // メタデータを更新
        for (const queueId of queueIds) {
          const queueItem = await tx
            .select()
            .from(syncQueue)
            .where(eq(syncQueue.id, queueId))
            .limit(1);

          if (queueItem.length > 0) {
            const item = queueItem[0];
            const metadataId = `${item.userId}-${item.entityType}-${item.entityId}`;

            // メタデータが存在しない場合は作成
            const existing = await tx
              .select()
              .from(syncMetadata)
              .where(eq(syncMetadata.id, metadataId))
              .limit(1);

            if (existing.length === 0) {
              await tx.insert(syncMetadata).values({
                id: metadataId,
                userId: item.userId,
                entityType: item.entityType,
                entityId: item.entityId,
                status: "synced",
                lastSyncedAt: new Date(),
                retryCount: 0,
                errorMessage: null,
              });
            } else {
              await tx
                .update(syncMetadata)
                .set({
                  status: "synced",
                  lastSyncedAt: new Date(),
                  retryCount: 0,
                  errorMessage: null,
                  updatedAt: new Date(),
                })
                .where(eq(syncMetadata.id, metadataId));
            }
          }
        }
      });
    } catch (error) {
      throw new UnexpectedError("同期完了のマーキングに失敗しました", error as Error);
    }
  };
}

function getMetadataByEntity(db: QueryExecutor) {
  return async (
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<SyncMetadataEntity | null> => {
    try {
      const rows = await db
        .select()
        .from(syncMetadata)
        .where(
          and(
            eq(syncMetadata.userId, userId),
            eq(syncMetadata.entityType, entityType),
            eq(syncMetadata.entityId, entityId)
          )
        )
        .limit(1);

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return createSyncMetadataEntity({
        id: row.id,
        userId: row.userId,
        entityType: row.entityType,
        entityId: row.entityId,
        lastSyncedAt: row.lastSyncedAt,
        status: row.status as "pending" | "syncing" | "synced" | "failed",
        errorMessage: row.errorMessage,
        retryCount: Number(row.retryCount),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    } catch (error) {
      throw new UnexpectedError("メタデータの取得に失敗しました", error as Error);
    }
  };
}

function updateSyncMetadata(db: QueryExecutor) {
  return async (
    metadataId: SyncMetadataId,
    updates: Partial<{
      status: "pending" | "syncing" | "synced" | "failed";
      lastSyncedAt: Date | null;
      errorMessage: string | null;
      retryCount: number;
    }>
  ): Promise<void> => {
    try {
      await db
        .update(syncMetadata)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(syncMetadata.id, metadataId));
    } catch (error) {
      throw new UnexpectedError("メタデータの更新に失敗しました", error as Error);
    }
  };
}

function getQueueByIds(db: QueryExecutor) {
  return async (queueIds: SyncQueueId[]): Promise<SyncQueueEntity[]> => {
    if (queueIds.length === 0) {
      return [];
    }

    try {
      const rows = await db
        .select()
        .from(syncQueue)
        .where(inArray(syncQueue.id, queueIds));

      return rows.map((row) =>
        createSyncQueueEntity({
          id: row.id,
          userId: row.userId,
          entityType: row.entityType,
          entityId: row.entityId,
          operation: row.operation as "create" | "update" | "delete",
          payload: JSON.parse(row.payload),
          timestamp: row.timestamp,
          sequenceNumber: Number(row.sequenceNumber),
          createdAt: row.createdAt,
        })
      );
    } catch (error) {
      throw new UnexpectedError("キューアイテムの取得に失敗しました", error as Error);
    }
  };
}

function deleteQueueItems(db: QueryExecutor) {
  return async (queueIds: SyncQueueId[]): Promise<void> => {
    if (queueIds.length === 0) {
      return;
    }

    try {
      await db.delete(syncQueue).where(inArray(syncQueue.id, queueIds));
    } catch (error) {
      throw new UnexpectedError("キューアイテムの削除に失敗しました", error as Error);
    }
  };
}