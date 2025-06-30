import { AppError } from "@backend/error";

import type {
  CheckDuplicatesRequest,
  EnqueueSyncRequest,
  ProcessSyncRequest,
} from "@dtos/request";
import {
  type CheckDuplicatesResponse,
  CheckDuplicatesResponseSchema,
  type EnqueueSyncResponse,
  EnqueueSyncResponseSchema,
  type ProcessSyncResponse,
  ProcessSyncResponseSchema,
  type SyncStatusResponse,
  SyncStatusResponseSchema,
} from "@dtos/response";

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
};

export function newSyncHandler(uc: SyncUsecase): SyncHandler {
  return {
    checkDuplicates: checkDuplicates(uc),
    getSyncStatus: getSyncStatus(uc),
    enqueueSync: enqueueSync(uc),
    processSync: processSync(uc),
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
