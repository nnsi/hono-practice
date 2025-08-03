// Re-export types from frontend-shared sync
export type {
  SyncQueueItem,
  SyncStatus,
  SyncResult,
  ISyncQueue,
  SyncManager,
  SyncManagerConfig,
  EntityType,
  SyncOperation,
} from "@packages/frontend-shared/sync";

// Re-export functions from frontend-shared sync
export {
  createSyncQueue,
  createSyncManager,
  AppEvents,
} from "@packages/frontend-shared/sync";

// Export web-specific implementation
export { getSyncManagerInstance } from "./getSyncManagerInstance";
