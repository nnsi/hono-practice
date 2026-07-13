import type { ServerEntity, SyncFailure, SyncResult } from "./syncResult";

export type SyncPostResponse = {
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  json(): Promise<unknown>;
};

export type SyncChunkResponse = {
  activities: SyncResult;
  activityKinds: SyncResult;
};

export class SyncProtocolError extends Error {
  constructor() {
    super("sync response did not match the expected protocol");
  }
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isServerEntity(value: unknown): value is ServerEntity {
  return isUnknownRecord(value) && typeof value.id === "string";
}

function isSyncFailure(value: unknown): value is SyncFailure {
  return (
    isUnknownRecord(value) &&
    typeof value.id === "string" &&
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    typeof value.retryable === "boolean"
  );
}

function isSyncResult(value: unknown): value is SyncResult {
  if (!isUnknownRecord(value)) return false;
  return (
    isStringArray(value.syncedIds) &&
    isStringArray(value.skippedIds) &&
    Array.isArray(value.serverWins) &&
    value.serverWins.every(isServerEntity) &&
    (value.failures === undefined ||
      (Array.isArray(value.failures) && value.failures.every(isSyncFailure)))
  );
}

export function parseSyncChunkResponse(value: unknown): SyncChunkResponse {
  if (
    !isUnknownRecord(value) ||
    !isSyncResult(value.activities) ||
    !isSyncResult(value.activityKinds)
  ) {
    throw new SyncProtocolError();
  }
  return { activities: value.activities, activityKinds: value.activityKinds };
}
