import { apiClient } from "@frontend/utils/apiClient";
import { createSyncManager } from "@packages/frontend-shared/sync";

import type { SyncManager } from "@packages/frontend-shared/sync";

// Singleton instance management
let syncManagerInstance: SyncManager | null = null;

/**
 * Get singleton instance for web frontend
 */
export function getSyncManagerInstance(userId?: string): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = createSyncManager({
      userId,
      dependencies: {
        apiClient,
      },
    });
  } else if (userId !== undefined) {
    // Update user ID if provided
    syncManagerInstance.updateUserId(userId);
  }
  return syncManagerInstance;
}
