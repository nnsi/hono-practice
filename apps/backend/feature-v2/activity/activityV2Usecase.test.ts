import { noopTracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";
import { describe, expect, test, vi } from "vitest";

import type { ActivityV2Repository } from "./activityV2Repository";
import { newActivityV2Usecase } from "./activityV2Usecase";

const USER_ID = "00000000-0000-4000-8000-000000000001" as UserId;
const NOW = new Date();

function makeActivityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    userId: USER_ID as string,
    name: "Test Activity",
    label: "",
    emoji: "🎯",
    iconType: "emoji",
    iconUrl: null,
    iconThumbnailUrl: null,
    description: "",
    quantityUnit: "",
    orderIndex: "aaa",
    showCombinedStats: true,
    recordingMode: "manual",
    recordingModeConfig: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function makeKindRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-100000000001",
    activityId: "10000000-0000-4000-8000-000000000001",
    name: "Kind 1",
    color: null,
    orderIndex: "a",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function makeActivityRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Test Activity",
    label: "",
    emoji: "🎯",
    iconType: "emoji",
    iconUrl: null,
    iconThumbnailUrl: null,
    description: "",
    quantityUnit: "",
    orderIndex: "aaa",
    showCombinedStats: true,
    recordingMode: "manual",
    recordingModeConfig: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function makeKindRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-100000000001",
    activityId: "10000000-0000-4000-8000-000000000001",
    name: "Kind 1",
    color: null,
    orderIndex: "a",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function createMockRepo(
  overrides: Partial<ActivityV2Repository> = {},
): ActivityV2Repository {
  return {
    getActivitiesByUserId: vi.fn().mockResolvedValue([]),
    getActivityKindsByActivityIds: vi.fn().mockResolvedValue([]),
    getOwnedActivityIds: vi.fn().mockResolvedValue([]),
    upsertActivities: vi.fn().mockResolvedValue([]),
    getActivitiesByIds: vi.fn().mockResolvedValue([]),
    upsertActivityKinds: vi.fn().mockResolvedValue([]),
    getActivityKindsByIds: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("activityV2Usecase", () => {
  describe("getActivities", () => {
    test("activities + kindsを返す", async () => {
      const actRows = [makeActivityRow()];
      const kindRows = [makeKindRow()];
      const repo = createMockRepo({
        getActivitiesByUserId: vi.fn().mockResolvedValue(actRows),
        getActivityKindsByActivityIds: vi.fn().mockResolvedValue(kindRows),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.getActivities(USER_ID);

      expect(result.activities).toHaveLength(1);
      expect(result.activityKinds).toHaveLength(1);
      expect(repo.getActivityKindsByActivityIds).toHaveBeenCalledWith([
        actRows[0].id,
      ]);
    });

    test("activityなし → kindsクエリにも空配列", async () => {
      const repo = createMockRepo();
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.getActivities(USER_ID);

      expect(result.activities).toHaveLength(0);
      expect(result.activityKinds).toHaveLength(0);
      expect(repo.getActivityKindsByActivityIds).toHaveBeenCalledWith([]);
    });
  });

  describe("syncActivities - activities", () => {
    test("空配列 → 早期リターン", async () => {
      const repo = createMockRepo();
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(USER_ID, [], []);

      expect(result.activities.syncedIds).toHaveLength(0);
      expect(result.activityKinds.syncedIds).toHaveLength(0);
      expect(repo.upsertActivities).not.toHaveBeenCalled();
    });

    test("全件upsert成功 → syncedIds", async () => {
      const req = makeActivityRequest();
      const row = makeActivityRow();
      const repo = createMockRepo({
        upsertActivities: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(USER_ID, [req as never], []);

      expect(result.activities.syncedIds).toContain(req.id);
      expect(result.activities.serverWins).toHaveLength(0);
    });

    test("updatedAtが未来すぎる → skip", async () => {
      const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const req = makeActivityRequest({ updatedAt: farFuture });
      const repo = createMockRepo();
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(USER_ID, [req as never], []);

      expect(result.activities.skippedIds).toContain(req.id);
      expect(repo.upsertActivities).not.toHaveBeenCalled();
    });

    test("upsertで返らなかったID → serverWins", async () => {
      const req1 = makeActivityRequest({
        id: "10000000-0000-4000-8000-000000000001",
      });
      const req2 = makeActivityRequest({
        id: "10000000-0000-4000-8000-000000000002",
      });

      const row1 = makeActivityRow({ id: req1.id });
      const serverRow2 = makeActivityRow({ id: req2.id, name: "Server ver" });

      const repo = createMockRepo({
        upsertActivities: vi.fn().mockResolvedValue([row1]),
        getActivitiesByIds: vi.fn().mockResolvedValue([serverRow2]),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(
        USER_ID,
        [req1, req2] as never[],
        [],
      );

      expect(result.activities.syncedIds).toContain(req1.id);
      expect(result.activities.serverWins).toHaveLength(1);
      expect(result.activities.serverWins[0].id).toBe(req2.id);
    });

    test("upsertで返らず、getByIdsでも見つからない → skippedIds", async () => {
      const req = makeActivityRequest({
        id: "10000000-0000-4000-8000-000000000099",
      });
      const repo = createMockRepo({
        upsertActivities: vi.fn().mockResolvedValue([]),
        getActivitiesByIds: vi.fn().mockResolvedValue([]),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(USER_ID, [req as never], []);

      expect(result.activities.skippedIds).toContain(req.id);
      expect(result.activities.syncedIds).toHaveLength(0);
      expect(result.activities.serverWins).toHaveLength(0);
    });

    test("updatedAtがちょうど5分先 → 許容される", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      try {
        const req = makeActivityRequest({
          updatedAt: "2026-03-01T12:05:00.000Z",
        });
        const row = makeActivityRow();
        const repo = createMockRepo({
          upsertActivities: vi.fn().mockResolvedValue([row]),
        });
        const usecase = newActivityV2Usecase(repo, noopTracer);

        const result = await usecase.syncActivities(
          USER_ID,
          [req as never],
          [],
        );

        expect(result.activities.skippedIds).toHaveLength(0);
        expect(repo.upsertActivities).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    test("updatedAtが5分1ms先 → skip", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      try {
        const req = makeActivityRequest({
          updatedAt: "2026-03-01T12:05:00.001Z",
        });
        const repo = createMockRepo();
        const usecase = newActivityV2Usecase(repo, noopTracer);

        const result = await usecase.syncActivities(
          USER_ID,
          [req as never],
          [],
        );

        expect(result.activities.skippedIds).toContain(req.id);
        expect(repo.upsertActivities).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    test("deletedAt付きデータも正常に同期される", async () => {
      const req = makeActivityRequest({ deletedAt: NOW.toISOString() });
      const row = makeActivityRow({ deletedAt: NOW });
      const repo = createMockRepo({
        upsertActivities: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(USER_ID, [req as never], []);

      expect(result.activities.syncedIds).toContain(req.id);
    });
  });

  describe("syncActivities - activityKinds", () => {
    test("所有権チェック: 未所有のactivityId → skip", async () => {
      const kindReq = makeKindRequest({
        activityId: "99999999-9999-4999-9999-999999999999",
      });
      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([]),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(
        USER_ID,
        [],
        [kindReq as never],
      );

      expect(result.activityKinds.skippedIds).toContain(kindReq.id);
      expect(result.activityKinds.syncedIds).toHaveLength(0);
      expect(repo.upsertActivityKinds).not.toHaveBeenCalled();
    });

    test("所有activityのkind → upsert成功", async () => {
      const actId = "10000000-0000-4000-8000-000000000001";
      const kindReq = makeKindRequest({ activityId: actId });
      const kindRow = makeKindRow({ activityId: actId });

      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([actId]),
        upsertActivityKinds: vi.fn().mockResolvedValue([kindRow]),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(
        USER_ID,
        [],
        [kindReq as never],
      );

      expect(result.activityKinds.syncedIds).toContain(kindReq.id);
    });

    test("kindのupdatedAtが未来すぎる → skip", async () => {
      const actId = "10000000-0000-4000-8000-000000000001";
      const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const kindReq = makeKindRequest({
        activityId: actId,
        updatedAt: farFuture,
      });
      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([actId]),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(
        USER_ID,
        [],
        [kindReq as never],
      );

      expect(result.activityKinds.skippedIds).toContain(kindReq.id);
      expect(repo.upsertActivityKinds).not.toHaveBeenCalled();
    });

    test("kindのupsertで返らなかったID → serverWins", async () => {
      const actId = "10000000-0000-4000-8000-000000000001";
      const kind1 = makeKindRequest({
        id: "10000000-0000-4000-8000-100000000001",
        activityId: actId,
      });
      const kind2 = makeKindRequest({
        id: "10000000-0000-4000-8000-100000000002",
        activityId: actId,
      });

      const kindRow1 = makeKindRow({ id: kind1.id });
      const serverKind2 = makeKindRow({ id: kind2.id, name: "Server kind" });

      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([actId]),
        upsertActivityKinds: vi.fn().mockResolvedValue([kindRow1]),
        getActivityKindsByIds: vi.fn().mockResolvedValue([serverKind2]),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(USER_ID, [], [
        kind1,
        kind2,
      ] as never[]);

      expect(result.activityKinds.syncedIds).toContain(kind1.id);
      expect(result.activityKinds.serverWins).toHaveLength(1);
      expect(result.activityKinds.serverWins[0].id).toBe(kind2.id);
    });

    test("kindのupsertで返らず、getByIdsでも見つからない → skippedIds", async () => {
      const actId = "10000000-0000-4000-8000-000000000001";
      const kindReq = makeKindRequest({
        id: "10000000-0000-4000-8000-100000000099",
        activityId: actId,
      });
      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([actId]),
        upsertActivityKinds: vi.fn().mockResolvedValue([]),
        getActivityKindsByIds: vi.fn().mockResolvedValue([]),
      });
      const usecase = newActivityV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivities(
        USER_ID,
        [],
        [kindReq as never],
      );

      expect(result.activityKinds.skippedIds).toContain(kindReq.id);
      expect(result.activityKinds.syncedIds).toHaveLength(0);
    });
  });
});
