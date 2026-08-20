export type SyncStatus = "synced" | "pending" | "failed" | "rejected";

export type Syncable<T> = T & { _syncStatus: SyncStatus };

/** Identifies the exact local revision that was included in a sync request. */
export type SyncRevision = {
  id: string;
  updatedAt: string;
};
