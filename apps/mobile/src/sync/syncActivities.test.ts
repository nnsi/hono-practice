import type { Mock } from "vitest";

import { getDatabase } from "../db/database";
import { activityRepository } from "../repositories/activityRepository";
import { apiClient, customFetch } from "../utils/apiClient";
import {
  syncActivities,
  syncActivityIconDeletions,
  syncActivityIcons,
} from "./syncActivities";

vi.mock("../repositories/activityRepository", () => ({
  activityRepository: {
    getPendingSyncActivities: vi.fn().mockResolvedValue([]),
    getPendingSyncActivityKinds: vi.fn().mockResolvedValue([]),
    markActivitiesSynced: vi.fn().mockResolvedValue(undefined),
    markActivitiesFailed: vi.fn().mockResolvedValue(undefined),
    markActivityKindsSynced: vi.fn().mockResolvedValue(undefined),
    markActivityKindsFailed: vi.fn().mockResolvedValue(undefined),
    markActivitiesRejected: vi.fn().mockResolvedValue(undefined),
    markActivityKindsRejected: vi.fn().mockResolvedValue(undefined),
    upsertActivities: vi.fn().mockResolvedValue(undefined),
    upsertActivityKinds: vi.fn().mockResolvedValue(undefined),
    getPendingIconDeletes: vi.fn().mockResolvedValue([]),
    removeIconDeleteQueue: vi.fn().mockResolvedValue(undefined),
    getPendingIconBlobs: vi.fn().mockResolvedValue([]),
    completeActivityIconSync: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../utils/apiClient", () => {
  const mockPost = vi.fn();
  return {
    apiClient: {
      users: {
        v2: {
          activities: {
            sync: { $post: mockPost },
          },
        },
      },
    },
    customFetch: vi.fn(),
    getApiUrl: vi.fn(() => "http://localhost:3456"),
  };
});

vi.mock("../db/database", () => ({
  getDatabase: vi.fn(),
}));

const mockPost = apiClient.users.v2.activities.sync.$post as Mock;
const mockCustomFetch = customFetch as Mock;
const mockGetDatabase = getDatabase as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncActivities", () => {
  it("returns early when no pending activities or kinds", async () => {
    (activityRepository.getPendingSyncActivities as Mock).mockResolvedValue([]);
    (activityRepository.getPendingSyncActivityKinds as Mock).mockResolvedValue(
      [],
    );

    await syncActivities();

    expect(mockPost).not.toHaveBeenCalled();
  });

  it("syncs activities and processes results", async () => {
    const pendingActivities = [
      {
        id: "a1",
        userId: "u1",
        name: "Run",
        label: "",
        emoji: "",
        iconType: "emoji" as const,
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending" as const,
      },
      {
        id: "a2",
        userId: "u1",
        name: "Read",
        label: "",
        emoji: "",
        iconType: "emoji" as const,
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "pages",
        orderIndex: "000002",
        showCombinedStats: false,
        createdAt: "2026-01-02T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending" as const,
      },
    ];
    const pendingKinds = [
      {
        id: "k1",
        activityId: "a1",
        name: "Morning",
        color: "#ff0000",
        orderIndex: "000001",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending" as const,
      },
    ];

    (activityRepository.getPendingSyncActivities as Mock).mockResolvedValue(
      pendingActivities,
    );
    (activityRepository.getPendingSyncActivityKinds as Mock).mockResolvedValue(
      pendingKinds,
    );

    mockPost.mockResolvedValue({
      ok: true,
      json: async () => ({
        activities: {
          syncedIds: ["a1", "a2"],
          serverWins: [],
          skippedIds: ["a3"],
        },
        activityKinds: {
          syncedIds: ["k1"],
          serverWins: [],
          skippedIds: [],
        },
      }),
    });

    await syncActivities();

    expect(activityRepository.markActivitiesSynced).toHaveBeenCalledWith([
      "a1",
      "a2",
    ]);
    expect(activityRepository.markActivitiesFailed).toHaveBeenCalledWith([
      "a3",
    ]);
    expect(activityRepository.markActivityKindsSynced).toHaveBeenCalledWith([
      "k1",
    ]);
    expect(activityRepository.markActivityKindsFailed).toHaveBeenCalledWith([]);
  });

  it("throws on 5xx API error", async () => {
    (activityRepository.getPendingSyncActivities as Mock).mockResolvedValue([
      {
        id: "a1",
        _syncStatus: "pending",
        userId: "u1",
        name: "Run",
        label: "",
        emoji: "",
        iconType: "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);
    (activityRepository.getPendingSyncActivityKinds as Mock).mockResolvedValue(
      [],
    );

    mockPost.mockResolvedValue({ ok: false, status: 500 });

    await expect(syncActivities()).rejects.toThrow("syncActivities failed");

    expect(activityRepository.markActivitiesSynced).not.toHaveBeenCalled();
    expect(activityRepository.markActivitiesFailed).not.toHaveBeenCalled();
    expect(activityRepository.markActivityKindsSynced).not.toHaveBeenCalled();
    expect(activityRepository.markActivityKindsFailed).not.toHaveBeenCalled();
  });

  it("marks items as rejected on 4xx and does not throw", async () => {
    (activityRepository.getPendingSyncActivities as Mock).mockResolvedValue([
      {
        id: "a1",
        _syncStatus: "pending",
        userId: "u1",
        name: "Run",
        label: "",
        emoji: "",
        iconType: "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);
    (activityRepository.getPendingSyncActivityKinds as Mock).mockResolvedValue([
      {
        id: "k1",
        activityId: "a1",
        name: "",
        color: null,
        orderIndex: "000001",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      },
    ]);

    mockPost.mockResolvedValue({ ok: false, status: 400 });

    await syncActivities(); // should not throw

    expect(activityRepository.markActivitiesRejected).toHaveBeenCalledWith([
      "a1",
    ]);
    expect(activityRepository.markActivityKindsRejected).toHaveBeenCalledWith([
      "k1",
    ]);
    // syncedIds/skippedIds are empty → called with [] (no-op)
    expect(activityRepository.markActivitiesSynced).toHaveBeenCalledWith([]);
    expect(activityRepository.markActivitiesFailed).toHaveBeenCalledWith([]);
  });

  it("strips _syncStatus before sending to API", async () => {
    const activity = {
      id: "a1",
      userId: "u1",
      name: "Run",
      label: "",
      emoji: "",
      iconType: "emoji" as const,
      iconUrl: null,
      iconThumbnailUrl: null,
      description: "",
      quantityUnit: "km",
      orderIndex: "000001",
      showCombinedStats: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      deletedAt: null,
      _syncStatus: "pending" as const,
    };
    const kind = {
      id: "k1",
      activityId: "a1",
      name: "Morning",
      color: "#ff0000",
      orderIndex: "000001",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      deletedAt: null,
      _syncStatus: "pending" as const,
    };

    (activityRepository.getPendingSyncActivities as Mock).mockResolvedValue([
      activity,
    ]);
    (activityRepository.getPendingSyncActivityKinds as Mock).mockResolvedValue([
      kind,
    ]);

    mockPost.mockResolvedValue({
      ok: true,
      json: async () => ({
        activities: { syncedIds: [], serverWins: [], skippedIds: [] },
        activityKinds: { syncedIds: [], serverWins: [], skippedIds: [] },
      }),
    });

    await syncActivities();

    const sentJson = mockPost.mock.calls[0][0].json;
    for (const a of sentJson.activities) {
      expect(a).not.toHaveProperty("_syncStatus");
    }
    for (const k of sentJson.activityKinds) {
      expect(k).not.toHaveProperty("_syncStatus");
    }
  });

  it("upserts server wins when present", async () => {
    (activityRepository.getPendingSyncActivities as Mock).mockResolvedValue([
      {
        id: "a1",
        _syncStatus: "pending",
        userId: "u1",
        name: "Run",
        label: "",
        emoji: "",
        iconType: "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);
    (activityRepository.getPendingSyncActivityKinds as Mock).mockResolvedValue(
      [],
    );

    const serverWinActivity = {
      id: "a1",
      userId: "u1",
      name: "Running",
      label: "cardio",
      emoji: "",
      iconType: "emoji",
      iconUrl: null,
      iconThumbnailUrl: null,
      description: "updated",
      quantityUnit: "km",
      orderIndex: "000001",
      showCombinedStats: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
      deletedAt: null,
    };
    const serverWinKind = {
      id: "k1",
      activityId: "a1",
      name: "Morning Run",
      color: "#00ff00",
      orderIndex: "000001",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
      deletedAt: null,
    };

    mockPost.mockResolvedValue({
      ok: true,
      json: async () => ({
        activities: {
          syncedIds: [],
          serverWins: [serverWinActivity],
          skippedIds: [],
        },
        activityKinds: {
          syncedIds: [],
          serverWins: [serverWinKind],
          skippedIds: [],
        },
      }),
    });

    await syncActivities();

    expect(activityRepository.upsertActivities).toHaveBeenCalledTimes(1);
    expect(activityRepository.upsertActivityKinds).toHaveBeenCalledTimes(1);
  });
});

describe("syncActivityIconDeletions", () => {
  it("returns early when queue is empty", async () => {
    (activityRepository.getPendingIconDeletes as Mock).mockResolvedValue([]);

    await syncActivityIconDeletions();

    expect(mockCustomFetch).not.toHaveBeenCalled();
  });

  it("removes from queue on successful DELETE (200)", async () => {
    (activityRepository.getPendingIconDeletes as Mock).mockResolvedValue([
      { activityId: "a1" },
    ]);
    mockCustomFetch.mockResolvedValue({ ok: true, status: 200 });

    await syncActivityIconDeletions();

    expect(activityRepository.removeIconDeleteQueue).toHaveBeenCalledWith("a1");
  });

  it("removes from queue on 404", async () => {
    (activityRepository.getPendingIconDeletes as Mock).mockResolvedValue([
      { activityId: "a1" },
    ]);
    mockCustomFetch.mockResolvedValue({ ok: false, status: 404 });

    await syncActivityIconDeletions();

    expect(activityRepository.removeIconDeleteQueue).toHaveBeenCalledWith("a1");
  });

  it("keeps in queue on other errors (e.g., 500)", async () => {
    (activityRepository.getPendingIconDeletes as Mock).mockResolvedValue([
      { activityId: "a1" },
    ]);
    mockCustomFetch.mockResolvedValue({ ok: false, status: 500 });

    await syncActivityIconDeletions();

    expect(activityRepository.removeIconDeleteQueue).not.toHaveBeenCalled();
  });
});

describe("syncActivityIcons", () => {
  it("returns early when no pending blobs", async () => {
    (activityRepository.getPendingIconBlobs as Mock).mockResolvedValue([]);

    await syncActivityIcons();

    expect(mockGetDatabase).not.toHaveBeenCalled();
    expect(mockCustomFetch).not.toHaveBeenCalled();
  });

  it("skips activity with sync_status !== 'synced'", async () => {
    (activityRepository.getPendingIconBlobs as Mock).mockResolvedValue([
      { activityId: "a1", base64: "abc", mimeType: "image/png" },
    ]);

    const mockDb = {
      getFirstAsync: vi.fn().mockResolvedValue({ sync_status: "pending" }),
    };
    mockGetDatabase.mockResolvedValue(mockDb);

    await syncActivityIcons();

    expect(mockCustomFetch).not.toHaveBeenCalled();
  });

  it("uploads and completes sync on success", async () => {
    const blob = {
      activityId: "a1",
      base64: "base64data",
      mimeType: "image/png",
    };
    (activityRepository.getPendingIconBlobs as Mock).mockResolvedValue([blob]);

    const mockDb = {
      getFirstAsync: vi.fn().mockResolvedValue({ sync_status: "synced" }),
    };
    mockGetDatabase.mockResolvedValue(mockDb);

    mockCustomFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        iconUrl: "https://example.com/icon.png",
        iconThumbnailUrl: "https://example.com/icon-thumb.png",
      }),
    });

    await syncActivityIcons();

    expect(mockCustomFetch).toHaveBeenCalledWith(
      "http://localhost:3456/users/activities/a1/icon",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: "base64data", mimeType: "image/png" }),
      },
    );
    expect(activityRepository.completeActivityIconSync).toHaveBeenCalledWith(
      "a1",
      "https://example.com/icon.png",
      "https://example.com/icon-thumb.png",
    );
  });

  it("throws on upload failure (H5)", async () => {
    (activityRepository.getPendingIconBlobs as Mock).mockResolvedValue([
      { activityId: "a1", base64: "abc", mimeType: "image/png" },
    ]);

    const mockDb = {
      getFirstAsync: vi.fn().mockResolvedValue({ sync_status: "synced" }),
    };
    mockGetDatabase.mockResolvedValue(mockDb);

    mockCustomFetch.mockResolvedValue({ ok: false });

    await expect(syncActivityIcons()).rejects.toThrow(
      "syncActivityIcons failed",
    );

    expect(activityRepository.completeActivityIconSync).not.toHaveBeenCalled();
  });
});
