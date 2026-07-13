import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApiClientObj, mockCustomFetchFn } = vi.hoisted(() => ({
  mockApiClientObj: {} as Record<string, unknown>,
  mockCustomFetchFn: vi.fn(),
}));

vi.mock("../db/activityRepository");
vi.mock("../db/schema", () => ({
  db: { activities: { get: vi.fn() } },
}));
vi.mock("@packages/sync-engine/mappers/apiMappers");
vi.mock("../api/apiClient", () => ({
  apiClient: mockApiClientObj,
}));
vi.mock("../api/customFetch", () => ({
  customFetch: mockCustomFetchFn,
}));

import { invalidateSync } from "@packages/sync-engine";
import {
  mapApiActivity,
  mapApiActivityKind,
} from "@packages/sync-engine/mappers/apiMappers";

import { activityRepository } from "../db/activityRepository";
import type { DexieActivity, DexieActivityKind } from "../db/schema";
import { db } from "../db/schema";
import {
  syncActivities,
  syncActivityIconDeletions,
  syncActivityIcons,
} from "./syncActivities";

const mockActivityRepo = vi.mocked(activityRepository);
const mockDb = vi.mocked(db) as unknown as {
  activities: { get: ReturnType<typeof vi.fn> };
};

describe("syncActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapApiActivity).mockImplementation(
      (a) => a as ReturnType<typeof mapApiActivity>,
    );
    vi.mocked(mapApiActivityKind).mockImplementation(
      (k) => k as ReturnType<typeof mapApiActivityKind>,
    );
  });

  describe("syncActivities()", () => {
    it("skips when no pending activities or kinds", async () => {
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue([]);
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([]);

      await syncActivities();

      expect(mockActivityRepo.markActivitiesSynced).not.toHaveBeenCalled();
    });

    it("sends data without _syncStatus field", async () => {
      const pending = [
        { id: "a1", name: "Run", _syncStatus: "pending" as const },
      ];
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue(
        pending as unknown as DexieActivity[],
      );
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([]);

      const mockPost = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            activities: {
              syncedIds: ["a1"],
              skippedIds: [],
              serverWins: [],
            },
            activityKinds: {
              syncedIds: [],
              skippedIds: [],
              serverWins: [],
            },
          }),
      });
      mockApiClientObj.users = {
        v2: { activities: { sync: { $post: mockPost } } },
      };

      await syncActivities();

      const sentJson = mockPost.mock.calls[0][0].json;
      expect(sentJson.activities[0]).not.toHaveProperty("_syncStatus");
      expect(sentJson.activities[0]).toEqual({ id: "a1", name: "Run" });
    });

    it("marks synced, marks failed, and upserts serverWins", async () => {
      const pendingActivities = [
        {
          id: "a1",
          name: "Run",
          updatedAt: "2026-01-01T00:00:00.000Z",
          _syncStatus: "pending" as const,
        },
      ];
      const pendingKinds = [
        {
          id: "k1",
          activityId: "a1",
          name: "Sprint",
          updatedAt: "2026-01-01T00:00:00.000Z",
          _syncStatus: "pending" as const,
        },
      ];
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue(
        pendingActivities as unknown as DexieActivity[],
      );
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue(
        pendingKinds as unknown as DexieActivityKind[],
      );

      const serverWinActivity = { id: "a2", name: "Server" };
      const serverWinKind = {
        id: "k2",
        activityId: "a2",
        name: "ServerKind",
      };

      const mockPost = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            activities: {
              syncedIds: ["a1"],
              skippedIds: ["a3"],
              serverWins: [serverWinActivity],
            },
            activityKinds: {
              syncedIds: ["k1"],
              skippedIds: ["k3"],
              serverWins: [serverWinKind],
            },
          }),
      });
      mockApiClientObj.users = {
        v2: { activities: { sync: { $post: mockPost } } },
      };

      await syncActivities();

      expect(mockActivityRepo.markActivitiesSynced).toHaveBeenCalledWith([
        { id: "a1", updatedAt: "2026-01-01T00:00:00.000Z" },
      ]);
      expect(mockActivityRepo.markActivitiesFailed).toHaveBeenCalledWith([]);
      expect(mockActivityRepo.upsertActivities).toHaveBeenCalledWith([
        serverWinActivity,
      ]);
      expect(mockActivityRepo.markActivityKindsSynced).toHaveBeenCalledWith([
        { id: "k1", updatedAt: "2026-01-01T00:00:00.000Z" },
      ]);
      expect(mockActivityRepo.markActivityKindsFailed).toHaveBeenCalledWith([]);
      expect(mockActivityRepo.upsertActivityKinds).toHaveBeenCalledWith([
        serverWinKind,
      ]);
    });

    it("throws when API returns 5xx", async () => {
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue([
        {
          id: "a1",
          updatedAt: "2026-01-01T00:00:00.000Z",
          _syncStatus: "pending",
        },
      ] as unknown as DexieActivity[]);
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([]);

      const mockPost = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      mockApiClientObj.users = {
        v2: { activities: { sync: { $post: mockPost } } },
      };

      await expect(syncActivities()).rejects.toThrow("sync request failed");

      expect(mockActivityRepo.markActivitiesSynced).not.toHaveBeenCalled();
      expect(mockActivityRepo.markActivitiesFailed).not.toHaveBeenCalled();
    });

    it.each([
      401, 403,
    ])("keeps local records retryable after %s", async (status) => {
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue([
        { id: "a1", _syncStatus: "pending" },
      ] as unknown as DexieActivity[]);
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([]);
      const mockPost = vi.fn().mockResolvedValue({ ok: false, status });
      mockApiClientObj.users = {
        v2: { activities: { sync: { $post: mockPost } } },
      };

      await expect(syncActivities()).rejects.toThrow(`failed: ${status}`);
      expect(mockActivityRepo.markActivitiesRejected).not.toHaveBeenCalled();
      expect(mockActivityRepo.markActivitiesSynced).not.toHaveBeenCalled();
    });

    it("resumes sync after a failed refresh and later reauthentication", async () => {
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue([
        {
          id: "a1",
          updatedAt: "2026-01-01T00:00:00.000Z",
          _syncStatus: "pending",
        },
      ] as unknown as DexieActivity[]);
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([]);
      const mockPost = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            activities: {
              syncedIds: ["a1"],
              skippedIds: [],
              serverWins: [],
              failures: [],
            },
            activityKinds: {
              syncedIds: [],
              skippedIds: [],
              serverWins: [],
              failures: [],
            },
          }),
        });
      mockApiClientObj.users = {
        v2: { activities: { sync: { $post: mockPost } } },
      };

      await expect(syncActivities()).rejects.toThrow("failed: 401");
      await expect(syncActivities()).resolves.toBeUndefined();
      expect(mockActivityRepo.markActivitiesSynced).toHaveBeenCalledWith([
        { id: "a1", updatedAt: "2026-01-01T00:00:00.000Z" },
      ]);
    });

    it("marks items as rejected on 4xx and does not throw", async () => {
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue([
        {
          id: "a1",
          name: "Run",
          updatedAt: "2026-01-01T00:00:00.000Z",
          _syncStatus: "pending",
        },
      ] as unknown as DexieActivity[]);
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([
        {
          id: "k1",
          activityId: "a1",
          name: "",
          updatedAt: "2026-01-01T00:00:00.000Z",
          _syncStatus: "pending",
        },
      ] as unknown as DexieActivityKind[]);

      const mockPost = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });
      mockApiClientObj.users = {
        v2: { activities: { sync: { $post: mockPost } } },
      };

      await syncActivities(); // should not throw

      expect(mockActivityRepo.markActivitiesRejected).toHaveBeenCalledWith([
        { id: "a1", updatedAt: "2026-01-01T00:00:00.000Z" },
      ]);
      expect(mockActivityRepo.markActivityKindsRejected).toHaveBeenCalledWith([
        { id: "k1", updatedAt: "2026-01-01T00:00:00.000Z" },
      ]);
      // syncedIds/skippedIds are empty → called with [] (no-op)
      expect(mockActivityRepo.markActivitiesSynced).toHaveBeenCalledWith([]);
      expect(mockActivityRepo.markActivitiesFailed).toHaveBeenCalledWith([]);
    });

    it("skips DB writes when sync generation changes (H4)", async () => {
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue([
        { id: "a1", name: "Run", _syncStatus: "pending" },
      ] as unknown as DexieActivity[]);
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([]);

      const mockPost = vi.fn().mockImplementation(async () => {
        invalidateSync();
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              activities: {
                syncedIds: ["a1"],
                skippedIds: [],
                serverWins: [],
              },
              activityKinds: {
                syncedIds: [],
                skippedIds: [],
                serverWins: [],
              },
            }),
        };
      });
      mockApiClientObj.users = {
        v2: { activities: { sync: { $post: mockPost } } },
      };

      await syncActivities();

      expect(mockActivityRepo.markActivitiesSynced).not.toHaveBeenCalled();
    });

    it("sends activities in chunks of 100", async () => {
      const pending = Array.from({ length: 150 }, (_, i) => ({
        id: `a-${i}`,
        name: `Activity ${i}`,
        _syncStatus: "pending" as const,
      })) as unknown as DexieActivity[];
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue(pending);
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([]);

      const mockPost = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            activities: {
              syncedIds: [],
              skippedIds: [],
              serverWins: [],
            },
            activityKinds: {
              syncedIds: [],
              skippedIds: [],
              serverWins: [],
            },
          }),
      });
      mockApiClientObj.users = {
        v2: { activities: { sync: { $post: mockPost } } },
      };

      await syncActivities();

      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(mockPost.mock.calls[0][0].json.activities).toHaveLength(100);
      expect(mockPost.mock.calls[1][0].json.activities).toHaveLength(50);
    });
  });

  describe("syncActivityIconDeletions()", () => {
    it("skips when delete queue is empty", async () => {
      mockActivityRepo.getPendingIconDeletes.mockResolvedValue([]);

      await syncActivityIconDeletions();

      expect(mockCustomFetchFn).not.toHaveBeenCalled();
    });

    it("removes from queue on success (200)", async () => {
      mockActivityRepo.getPendingIconDeletes.mockResolvedValue([
        { activityId: "a1" },
      ]);
      mockCustomFetchFn.mockResolvedValueOnce(
        new Response("ok", { status: 200 }),
      );

      await syncActivityIconDeletions();

      expect(mockActivityRepo.removeIconDeleteQueue).toHaveBeenCalledWith("a1");
    });

    it("removes from queue on 404", async () => {
      mockActivityRepo.getPendingIconDeletes.mockResolvedValue([
        { activityId: "a1" },
      ]);
      mockCustomFetchFn.mockResolvedValueOnce(
        new Response("not found", { status: 404 }),
      );

      await syncActivityIconDeletions();

      expect(mockActivityRepo.removeIconDeleteQueue).toHaveBeenCalledWith("a1");
    });

    it("does not remove from queue on 500", async () => {
      mockActivityRepo.getPendingIconDeletes.mockResolvedValue([
        { activityId: "a1" },
      ]);
      mockCustomFetchFn.mockResolvedValueOnce(
        new Response("error", { status: 500 }),
      );

      await syncActivityIconDeletions();

      expect(mockActivityRepo.removeIconDeleteQueue).not.toHaveBeenCalled();
    });
  });

  describe("syncActivityIcons()", () => {
    it("skips when no pending blobs", async () => {
      mockActivityRepo.getPendingIconBlobs.mockResolvedValue([]);

      await syncActivityIcons();

      expect(mockCustomFetchFn).not.toHaveBeenCalled();
    });

    it("skips unsynced activities", async () => {
      mockActivityRepo.getPendingIconBlobs.mockResolvedValue([
        { activityId: "a1", base64: "abc", mimeType: "image/png" },
      ]);
      mockDb.activities.get.mockResolvedValue({
        id: "a1",
        _syncStatus: "pending",
      });

      await syncActivityIcons();

      expect(mockCustomFetchFn).not.toHaveBeenCalled();
    });

    it("skips if activity does not exist", async () => {
      mockActivityRepo.getPendingIconBlobs.mockResolvedValue([
        { activityId: "a1", base64: "abc", mimeType: "image/png" },
      ]);
      mockDb.activities.get.mockResolvedValue(undefined);

      await syncActivityIcons();

      expect(mockCustomFetchFn).not.toHaveBeenCalled();
    });

    it("uploads and completes on success", async () => {
      mockActivityRepo.getPendingIconBlobs.mockResolvedValue([
        { activityId: "a1", base64: "abc123", mimeType: "image/png" },
      ]);
      mockDb.activities.get.mockResolvedValue({
        id: "a1",
        _syncStatus: "synced",
      });

      mockCustomFetchFn.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            iconUrl: "https://r2.example.com/icon.png",
            iconThumbnailUrl: "https://r2.example.com/icon-thumb.png",
          }),
      });

      await syncActivityIcons();

      expect(mockCustomFetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/users/activities/a1/icon"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            base64: "abc123",
            mimeType: "image/png",
          }),
        }),
      );

      expect(mockActivityRepo.completeActivityIconSync).toHaveBeenCalledWith(
        "a1",
        "https://r2.example.com/icon.png",
        "https://r2.example.com/icon-thumb.png",
      );
    });

    it("throws on upload failure (H5)", async () => {
      mockActivityRepo.getPendingIconBlobs.mockResolvedValue([
        { activityId: "a1", base64: "abc123", mimeType: "image/png" },
      ]);
      mockDb.activities.get.mockResolvedValue({
        id: "a1",
        _syncStatus: "synced",
      });

      mockCustomFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(syncActivityIcons()).rejects.toThrow(
        "syncActivityIcons failed",
      );

      expect(mockActivityRepo.completeActivityIconSync).not.toHaveBeenCalled();
    });
  });
});
