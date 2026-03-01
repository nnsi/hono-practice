import { noopTracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";
import { describe, expect, test, vi } from "vitest";

import type { ActivityLogV2Repository } from "./activityLogV2Repository";
import { newActivityLogV2Usecase } from "./activityLogV2Usecase";

const USER_ID = "00000000-0000-4000-8000-000000000001" as UserId;
const OWNED_ACTIVITY_ID = "00000000-0000-4000-8000-000000000010";
const NOW = new Date();

function makeLogRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    userId: USER_ID as string,
    activityId: OWNED_ACTIVITY_ID,
    activityKindId: null,
    quantity: 5,
    memo: "",
    date: "2025-01-01",
    time: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function makeUpsertRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    activityId: OWNED_ACTIVITY_ID,
    activityKindId: null,
    quantity: 5,
    memo: "",
    date: "2025-01-01",
    time: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function createMockRepo(
  overrides: Partial<ActivityLogV2Repository> = {},
): ActivityLogV2Repository {
  return {
    getActivityLogsByUserId: vi.fn().mockResolvedValue([]),
    getOwnedActivityIds: vi.fn().mockResolvedValue([OWNED_ACTIVITY_ID]),
    upsertActivityLogs: vi.fn().mockResolvedValue([]),
    getActivityLogsByIds: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("activityLogV2Usecase", () => {
  describe("getActivityLogs", () => {
    test("repoに委譲してlogs形式で返す", async () => {
      const rows = [makeLogRow()];
      const repo = createMockRepo({
        getActivityLogsByUserId: vi.fn().mockResolvedValue(rows),
      });
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      const result = await usecase.getActivityLogs(USER_ID);

      expect(result.logs).toHaveLength(1);
      expect(repo.getActivityLogsByUserId).toHaveBeenCalledWith(USER_ID, undefined);
    });

    test("sinceパラメータをrepoに渡す", async () => {
      const repo = createMockRepo();
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      await usecase.getActivityLogs(USER_ID, "2025-01-01T00:00:00.000Z");

      expect(repo.getActivityLogsByUserId).toHaveBeenCalledWith(
        USER_ID,
        "2025-01-01T00:00:00.000Z",
      );
    });
  });

  describe("syncActivityLogs", () => {
    test("空配列 → 早期リターン", async () => {
      const repo = createMockRepo();
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivityLogs(USER_ID, []);

      expect(result.syncedIds).toHaveLength(0);
      expect(result.serverWins).toHaveLength(0);
      expect(result.skippedIds).toHaveLength(0);
      expect(repo.upsertActivityLogs).not.toHaveBeenCalled();
    });

    test("全件upsert成功 → syncedIdsに含まれる", async () => {
      const req = makeUpsertRequest();
      const row = makeLogRow();
      const repo = createMockRepo({
        upsertActivityLogs: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivityLogs(USER_ID, [req as never]);

      expect(result.syncedIds).toContain(req.id);
      expect(result.serverWins).toHaveLength(0);
    });

    test("所有権チェック: 未所有のactivityId → skip", async () => {
      const req = makeUpsertRequest({
        activityId: "99999999-9999-4999-9999-999999999999",
      });
      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([OWNED_ACTIVITY_ID]),
      });
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivityLogs(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(result.syncedIds).toHaveLength(0);
      expect(repo.upsertActivityLogs).not.toHaveBeenCalled();
    });

    test("updatedAtが未来すぎる → skip", async () => {
      const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const req = makeUpsertRequest({ updatedAt: farFuture });
      const repo = createMockRepo();
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivityLogs(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(repo.upsertActivityLogs).not.toHaveBeenCalled();
    });

    test("upsertで返らなかったID → serverWinsとして返す", async () => {
      const req1 = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000001" });
      const req2 = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000002" });

      const row1 = makeLogRow({ id: req1.id });
      const serverRow2 = makeLogRow({ id: req2.id, quantity: 999 });

      const repo = createMockRepo({
        upsertActivityLogs: vi.fn().mockResolvedValue([row1]),
        getActivityLogsByIds: vi.fn().mockResolvedValue([serverRow2]),
      });
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivityLogs(USER_ID, [req1, req2] as never[]);

      expect(result.syncedIds).toContain(req1.id);
      expect(result.serverWins).toHaveLength(1);
      expect(result.serverWins[0].id).toBe(req2.id);
    });

    test("upsertで返らず、getByIdsでも見つからない → skippedIds", async () => {
      const req = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000099" });
      const repo = createMockRepo({
        upsertActivityLogs: vi.fn().mockResolvedValue([]),
        getActivityLogsByIds: vi.fn().mockResolvedValue([]),
      });
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivityLogs(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(result.syncedIds).toHaveLength(0);
    });

    test("混合: synced + serverWins + skipped(所有権)", async () => {
      const reqSynced = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000001" });
      const reqServerWin = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000002" });
      const reqNotOwned = makeUpsertRequest({
        id: "10000000-0000-4000-8000-000000000003",
        activityId: "99999999-9999-4999-9999-999999999999",
      });

      const syncedRow = makeLogRow({ id: reqSynced.id });
      const serverWinRow = makeLogRow({ id: reqServerWin.id, quantity: 999 });

      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([OWNED_ACTIVITY_ID]),
        upsertActivityLogs: vi.fn().mockResolvedValue([syncedRow]),
        getActivityLogsByIds: vi.fn().mockResolvedValue([serverWinRow]),
      });
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivityLogs(
        USER_ID,
        [reqSynced, reqServerWin, reqNotOwned] as never[],
      );

      expect(result.syncedIds).toContain(reqSynced.id);
      expect(result.serverWins).toHaveLength(1);
      expect(result.serverWins[0].id).toBe(reqServerWin.id);
      expect(result.skippedIds).toContain(reqNotOwned.id);
    });

    test("updatedAtがちょうど5分先 → 許容される", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      try {
        const req = makeUpsertRequest({ updatedAt: "2026-03-01T12:05:00.000Z" });
        const row = makeLogRow();
        const repo = createMockRepo({
          upsertActivityLogs: vi.fn().mockResolvedValue([row]),
        });
        const usecase = newActivityLogV2Usecase(repo, noopTracer);

        const result = await usecase.syncActivityLogs(USER_ID, [req as never]);

        expect(result.skippedIds).toHaveLength(0);
        expect(repo.upsertActivityLogs).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    test("updatedAtが5分1ms先 → skip", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      try {
        const req = makeUpsertRequest({ updatedAt: "2026-03-01T12:05:00.001Z" });
        const repo = createMockRepo();
        const usecase = newActivityLogV2Usecase(repo, noopTracer);

        const result = await usecase.syncActivityLogs(USER_ID, [req as never]);

        expect(result.skippedIds).toContain(req.id);
        expect(repo.upsertActivityLogs).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    test("deletedAt付きデータも正常に同期される", async () => {
      const req = makeUpsertRequest({ deletedAt: NOW.toISOString() });
      const row = makeLogRow({ deletedAt: NOW });
      const repo = createMockRepo({
        upsertActivityLogs: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newActivityLogV2Usecase(repo, noopTracer);

      const result = await usecase.syncActivityLogs(USER_ID, [req as never]);

      expect(result.syncedIds).toContain(req.id);
    });
  });
});
