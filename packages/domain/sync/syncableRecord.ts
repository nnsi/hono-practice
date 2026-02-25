export type SyncStatus = "synced" | "pending" | "failed";

export type Syncable<T> = T & { _syncStatus: SyncStatus };
