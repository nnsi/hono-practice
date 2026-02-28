import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockApiClientObj, mockCustomFetchFn } = vi.hoisted(() => ({
  mockApiClientObj: {} as any,
  mockCustomFetchFn: vi.fn(),
}));

vi.mock("../db/activityRepository");
vi.mock("../db/schema", () => ({
  db: { activities: { get: vi.fn() } },
}));
vi.mock("@packages/domain/sync/apiMappers");
vi.mock("../utils/apiClient", () => ({
  apiClient: mockApiClientObj,
  customFetch: mockCustomFetchFn,
}));

import { activityRepository } from "../db/activityRepository";
import { db } from "../db/schema";
import { mapApiActivity, mapApiActivityKind } from "@packages/domain/sync/apiMappers";
import {
  syncActivities,
  syncActivityIconDeletions,
  syncActivityIcons,
} from "./syncActivities";

const mockActivityRepo = vi.mocked(activityRepository);
const mockDb = vi.mocked(db) as any;

describe("syncActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapApiActivity).mockImplementation((a: any) => a);
    vi.mocked(mapApiActivityKind).mockImplementation((k: any) => k);
  });

  describe("syncActivities()", () => {
    it("skips when no pending activities or kinds", async () => {
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue([]);
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([]);

      await syncActivities();

      expect(
        mockActivityRepo.markActivitiesSynced,
      ).not.toHaveBeenCalled();
    });

    it("sends data without _syncStatus field", async () => {
      const pending = [
        { id: "a1", name: "Run", _syncStatus: "pending" as const },
      ];
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue(
        pending as any,
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
        { id: "a1", name: "Run", _syncStatus: "pending" as const },
      ];
      const pendingKinds = [
        {
          id: "k1",
          activityId: "a1",
          name: "Sprint",
          _syncStatus: "pending" as const,
        },
      ];
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue(
        pendingActivities as any,
      );
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue(
        pendingKinds as any,
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
        "a1",
      ]);
      expect(mockActivityRepo.markActivitiesFailed).toHaveBeenCalledWith([
        "a3",
      ]);
      expect(mockActivityRepo.upsertActivities).toHaveBeenCalledWith([
        serverWinActivity,
      ]);
      expect(mockActivityRepo.markActivityKindsSynced).toHaveBeenCalledWith([
        "k1",
      ]);
      expect(mockActivityRepo.markActivityKindsFailed).toHaveBeenCalledWith([
        "k3",
      ]);
      expect(mockActivityRepo.upsertActivityKinds).toHaveBeenCalledWith([
        serverWinKind,
      ]);
    });

    it("does not process result when API returns not ok", async () => {
      mockActivityRepo.getPendingSyncActivities.mockResolvedValue([
        { id: "a1", _syncStatus: "pending" },
      ] as any);
      mockActivityRepo.getPendingSyncActivityKinds.mockResolvedValue([]);

      const mockPost = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      mockApiClientObj.users = {
        v2: { activities: { sync: { $post: mockPost } } },
      };

      await syncActivities();

      expect(
        mockActivityRepo.markActivitiesSynced,
      ).not.toHaveBeenCalled();
      expect(
        mockActivityRepo.markActivitiesFailed,
      ).not.toHaveBeenCalled();
    });

    it("sends activities in chunks of 100", async () => {
      const pending = Array.from({ length: 150 }, (_, i) => ({
        id: `a-${i}`,
        name: `Activity ${i}`,
        _syncStatus: "pending" as const,
      })) as any;
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

      expect(mockActivityRepo.removeIconDeleteQueue).toHaveBeenCalledWith(
        "a1",
      );
    });

    it("removes from queue on 404", async () => {
      mockActivityRepo.getPendingIconDeletes.mockResolvedValue([
        { activityId: "a1" },
      ]);
      mockCustomFetchFn.mockResolvedValueOnce(
        new Response("not found", { status: 404 }),
      );

      await syncActivityIconDeletions();

      expect(mockActivityRepo.removeIconDeleteQueue).toHaveBeenCalledWith(
        "a1",
      );
    });

    it("does not remove from queue on 500", async () => {
      mockActivityRepo.getPendingIconDeletes.mockResolvedValue([
        { activityId: "a1" },
      ]);
      mockCustomFetchFn.mockResolvedValueOnce(
        new Response("error", { status: 500 }),
      );

      await syncActivityIconDeletions();

      expect(
        mockActivityRepo.removeIconDeleteQueue,
      ).not.toHaveBeenCalled();
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

      expect(
        mockActivityRepo.completeActivityIconSync,
      ).toHaveBeenCalledWith(
        "a1",
        "https://r2.example.com/icon.png",
        "https://r2.example.com/icon-thumb.png",
      );
    });

    it("does not complete sync on upload failure", async () => {
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

      await syncActivityIcons();

      expect(
        mockActivityRepo.completeActivityIconSync,
      ).not.toHaveBeenCalled();
    });
  });
});
