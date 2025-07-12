import { AppError } from "@backend/error";

import type {
  BatchSyncRequest,
  CheckDuplicatesRequest,
  EnqueueSyncRequest,
  ProcessSyncRequest,
  PullSyncRequest,
} from "@dtos/request";
import {
  type BatchSyncResponse,
  BatchSyncResponseSchema,
  type CheckDuplicatesResponse,
  CheckDuplicatesResponseSchema,
  type EnqueueSyncResponse,
  EnqueueSyncResponseSchema,
  type ProcessSyncResponse,
  ProcessSyncResponseSchema,
  type PullSyncResponse,
  PullSyncResponseSchema,
  type SyncStatusResponse,
  SyncStatusResponseSchema,
} from "@dtos/response";

import type { ConflictResolutionStrategy } from "./syncService";
import type { SyncUsecase } from "./syncUsecase";

// Handler type definition
export type SyncHandler = {
  checkDuplicates(
    userId: string,
    params: CheckDuplicatesRequest,
  ): Promise<CheckDuplicatesResponse>;
  getSyncStatus(userId: string): Promise<SyncStatusResponse>;
  enqueueSync(
    userId: string,
    params: EnqueueSyncRequest,
  ): Promise<EnqueueSyncResponse>;
  processSync(
    userId: string,
    params: ProcessSyncRequest,
  ): Promise<ProcessSyncResponse>;
  batchSync(
    userId: string,
    params: BatchSyncRequest,
    strategy?: ConflictResolutionStrategy,
  ): Promise<BatchSyncResponse>;
  getSyncQueue(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<{
    items: Array<{
      id: string;
      entityType: string;
      entityId: string;
      operation: string;
      timestamp: string;
      sequenceNumber: number;
    }>;
    total: number;
    hasMore: boolean;
  }>;
  deleteSyncQueueItem(userId: string, queueId: string): Promise<void>;
  pullSync(userId: string, params: PullSyncRequest): Promise<PullSyncResponse>;
};

export function newSyncHandler(uc: SyncUsecase): SyncHandler {
  return {
    checkDuplicates: checkDuplicates(uc),
    getSyncStatus: getSyncStatus(uc),
    enqueueSync: enqueueSync(uc),
    processSync: processSync(uc),
    batchSync: batchSync(uc),
    getSyncQueue: getSyncQueue(uc),
    deleteSyncQueueItem: deleteSyncQueueItem(uc),
    pullSync: pullSync(uc),
  };
}

function checkDuplicates(uc: SyncUsecase) {
  return async (userId: string, params: CheckDuplicatesRequest) => {
    const operations = params.operations.map((op) => ({
      ...op,
      timestamp: new Date(op.timestamp),
    }));

    const results = await uc.checkDuplicates(userId, operations);

    const response = {
      results: results.map((result) => ({
        isDuplicate: result.isDuplicate,
        conflictingOperationIds: result.conflictingOperations?.map(
          (op) => op.id,
        ),
      })),
    };

    const parsedResponse = CheckDuplicatesResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      throw new AppError("failed to parse check duplicates response", 500);
    }

    return parsedResponse.data;
  };
}

function getSyncStatus(uc: SyncUsecase) {
  return async (userId: string) => {
    const status = await uc.getSyncStatus(userId);

    const response = {
      status: {
        pendingCount: status.pendingCount,
        syncingCount: status.syncingCount,
        syncedCount: status.syncedCount,
        failedCount: status.failedCount,
        totalCount: status.totalCount,
        syncPercentage: status.syncPercentage,
        lastSyncedAt: status.lastSyncedAt?.toISOString() || null,
      },
    };

    const parsedResponse = SyncStatusResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      throw new AppError("failed to parse sync status response", 500);
    }

    return parsedResponse.data;
  };
}

function enqueueSync(uc: SyncUsecase) {
  return async (userId: string, params: EnqueueSyncRequest) => {
    const operations = params.operations.map((op) => ({
      ...op,
      timestamp: new Date(op.timestamp),
      userId,
    }));

    const enqueuedOperations = await uc.enqueueSyncOperations(operations);

    const response = {
      enqueuedCount: enqueuedOperations.length,
      operations: enqueuedOperations.map((op) => ({
        id: op.id,
        entityType: op.entityType,
        entityId: op.entityId,
        operation: op.operation,
        sequenceNumber: op.sequenceNumber,
      })),
    };

    const parsedResponse = EnqueueSyncResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      throw new AppError("failed to parse enqueue sync response", 500);
    }

    return parsedResponse.data;
  };
}

function processSync(uc: SyncUsecase) {
  return async (userId: string, params: ProcessSyncRequest) => {
    const result = await uc.processSyncQueue(userId, {
      batchSize: params.batchSize,
      maxRetries: params.maxRetries,
    });

    const parsedResponse = ProcessSyncResponseSchema.safeParse(result);
    if (!parsedResponse.success) {
      throw new AppError("failed to parse process sync response", 500);
    }

    return parsedResponse.data;
  };
}

function batchSync(uc: SyncUsecase) {
  return async (
    userId: string,
    params: BatchSyncRequest,
    strategy?: ConflictResolutionStrategy,
  ) => {
    const response = await uc.batchSync(userId, params, strategy);

    const parsedResponse = BatchSyncResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      console.error("Batch sync response parse error:", parsedResponse.error);
      console.error("Response object:", JSON.stringify(response, null, 2));
      throw new AppError("failed to parse batch sync response", 500);
    }

    return parsedResponse.data;
  };
}

function getSyncQueue(uc: SyncUsecase) {
  return async (userId: string, limit?: number, offset?: number) => {
    const result = await uc.getSyncQueueItems(userId, limit, offset);

    return {
      items: result.items.map((item) => ({
        id: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        timestamp: item.timestamp.toISOString(),
        sequenceNumber: item.sequenceNumber,
      })),
      total: result.total,
      hasMore: result.hasMore,
    };
  };
}

function deleteSyncQueueItem(uc: SyncUsecase) {
  return async (userId: string, queueId: string) => {
    await uc.deleteSyncQueueItem(userId, queueId);
  };
}

function pullSync(uc: SyncUsecase) {
  return async (userId: string, params: PullSyncRequest) => {
    const response = await uc.pullSync(userId, params);

    const parsedResponse = PullSyncResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      throw new AppError("failed to parse pull sync response", 500);
    }

    return parsedResponse.data;
  };
}
