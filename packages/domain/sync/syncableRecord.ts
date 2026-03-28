export type SyncStatus = "synced" | "pending" | "failed" | "rejected";

export type Syncable<T> = T & { _syncStatus: SyncStatus };
