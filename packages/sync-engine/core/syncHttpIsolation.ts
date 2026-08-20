import {
  type SyncChunkResponse,
  type SyncPostResponse,
  parseSyncChunkResponse,
} from "./syncHttpResponseValidation";
import { postSyncChunkWithRetry } from "./syncHttpRetryPolicy";
import type { SyncFailure, SyncResult } from "./syncResult";

type TaggedRecord<T, K> =
  | { type: "activity"; value: T }
  | { type: "kind"; value: K };

function partitionRecords<T, K>(
  items: TaggedRecord<T, K>[],
): {
  activities: T[];
  activityKinds: K[];
} {
  const activities: T[] = [];
  const activityKinds: K[] = [];
  for (const item of items) {
    if (item.type === "activity") activities.push(item.value);
    else activityKinds.push(item.value);
  }
  return { activities, activityKinds };
}

const emptyResult = (): SyncResult => ({
  syncedIds: [],
  skippedIds: [],
  serverWins: [],
  failures: [],
});

function mergeResult(left: SyncResult, right: SyncResult): SyncResult {
  return {
    syncedIds: [...left.syncedIds, ...right.syncedIds],
    skippedIds: [...left.skippedIds, ...right.skippedIds],
    serverWins: [...left.serverWins, ...right.serverWins],
    failures: [...(left.failures ?? []), ...(right.failures ?? [])],
  };
}

function mergeChunk(
  left: SyncChunkResponse,
  right: SyncChunkResponse,
): SyncChunkResponse {
  return {
    activities: mergeResult(left.activities, right.activities),
    activityKinds: mergeResult(left.activityKinds, right.activityKinds),
  };
}

function rejectedRecordResult<
  T extends { id: string },
  K extends { id: string },
>(item: TaggedRecord<T, K>, status: number): SyncChunkResponse {
  const failure: SyncFailure = {
    id: item.value.id,
    code: `HTTP_${status}`,
    message: `Record rejected with HTTP ${status}`,
    retryable: false,
  };
  return item.type === "kind"
    ? {
        activities: emptyResult(),
        activityKinds: { ...emptyResult(), failures: [failure] },
      }
    : {
        activities: { ...emptyResult(), failures: [failure] },
        activityKinds: emptyResult(),
      };
}

/**
 * Posts a mixed Activity/Kind chunk. Permanent record-validation failures are
 * bisected so only irreparable records are rejected; 429 uses bounded retries.
 */
export async function postActivityChunkWithIsolation<
  T extends { id: string },
  K extends { id: string },
>(options: {
  activities: T[];
  activityKinds: K[];
  post(activities: T[], activityKinds: K[]): Promise<SyncPostResponse>;
  sleep?: (milliseconds: number) => Promise<void>;
  max429Retries?: number;
}): Promise<SyncChunkResponse> {
  const request = async (
    activities: T[],
    activityKinds: K[],
  ): Promise<SyncChunkResponse> => {
    const response = await postSyncChunkWithRetry({
      activities,
      activityKinds,
      post: options.post,
      sleep: options.sleep,
      max429Retries: options.max429Retries,
    });
    if (response.ok) {
      return parseSyncChunkResponse(await response.json());
    }

    const activityItems: TaggedRecord<T, K>[] = activities.map((value) => ({
      type: "activity",
      value,
    }));
    const kindItems: TaggedRecord<T, K>[] = activityKinds.map((value) => ({
      type: "kind",
      value,
    }));
    const combined: TaggedRecord<T, K>[] = [...activityItems, ...kindItems];
    if (combined.length > 1) {
      const middle = Math.ceil(combined.length / 2);
      const left = partitionRecords(combined.slice(0, middle));
      const right = partitionRecords(combined.slice(middle));
      const leftResult = await request(left.activities, left.activityKinds);
      const rightResult = await request(right.activities, right.activityKinds);
      return mergeChunk(leftResult, rightResult);
    }

    const item = combined[0];
    if (!item) {
      return { activities: emptyResult(), activityKinds: emptyResult() };
    }
    return rejectedRecordResult(item, response.status);
  };

  return request(options.activities, options.activityKinds);
}
