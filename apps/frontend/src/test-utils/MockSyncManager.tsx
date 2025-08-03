import { vi } from "vitest";

import type {
  SyncManager,
  SyncResult,
  SyncStatus,
} from "@frontend/services/sync";

export const createMockSyncStatus = (
  overrides?: Partial<SyncStatus>,
): SyncStatus => ({
  pendingCount: 0,
  syncingCount: 0,
  failedCount: 0,
  totalCount: 0,
  syncPercentage: 100,
  lastSyncedAt: null,
  ...overrides,
});

export const createMockSyncResult = (
  overrides?: Partial<SyncResult>,
): SyncResult => ({
  clientId: "00000000-0000-4000-8000-000000000001",
  status: "success",
  serverId: "00000000-0000-4000-8000-000000000002",
  ...overrides,
});

export const createMockSyncManager = (
  overrides?: Partial<SyncManager>,
): SyncManager => ({
  updateUserId: vi.fn(),
  enqueue: vi.fn().mockResolvedValue("00000000-0000-4000-8000-000000000001"),
  syncBatch: vi.fn().mockResolvedValue([createMockSyncResult()]),
  syncAll: vi.fn().mockResolvedValue(undefined),
  startAutoSync: vi.fn(),
  stopAutoSync: vi.fn(),
  getSyncStatus: vi.fn().mockReturnValue(createMockSyncStatus()),
  subscribeToStatus: vi.fn().mockReturnValue(() => {}),
  clearQueue: vi.fn().mockResolvedValue(undefined),
  checkDuplicates: vi.fn().mockResolvedValue([{ isDuplicate: false }]),
  pullSync: vi.fn().mockResolvedValue({
    changes: [],
    hasMore: false,
  }),
  ...overrides,
});
