import { noopTracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";
import { describe, expect, test, vi } from "vitest";

import type { GoalV2Repository } from "./goalV2Repository";
import { newGoalV2Usecase } from "./goalV2Usecase";

const USER_ID = "00000000-0000-4000-8000-000000000001" as UserId;
const OWNED_ACTIVITY_ID = "00000000-0000-4000-8000-000000000010";
const NOW = new Date();

function makeGoalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    userId: USER_ID as string,
    activityId: OWNED_ACTIVITY_ID,
    dailyTargetQuantity: "10",
    startDate: "2025-01-01",
    endDate: null,
    isActive: true,
    description: "",
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
    dailyTargetQuantity: 10,
    startDate: "2025-01-01",
    endDate: null,
    isActive: true,
    description: "",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function createMockRepo(
  overrides: Partial<GoalV2Repository> = {},
): GoalV2Repository {
  return {
    getGoalsByUserId: vi.fn().mockResolvedValue([]),
    getGoalActualQuantity: vi.fn().mockResolvedValue(0),
    getOwnedActivityIds: vi.fn().mockResolvedValue([OWNED_ACTIVITY_ID]),
    upsertGoals: vi.fn().mockResolvedValue([]),
    getGoalsByIds: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("goalV2Usecase", () => {
  describe("getGoals", () => {
    test("ゴールなし → 空配列", async () => {
      const repo = createMockRepo();
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.getGoals(USER_ID);

      expect(result.goals).toHaveLength(0);
    });

    test("ゴールあり → stats付きで返す", async () => {
      const row = makeGoalRow({
        startDate: "2025-01-01",
        endDate: "2025-01-10",
      });
      const repo = createMockRepo({
        getGoalsByUserId: vi.fn().mockResolvedValue([row]),
        getGoalActualQuantity: vi.fn().mockResolvedValue(50),
      });
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.getGoals(USER_ID);

      expect(result.goals).toHaveLength(1);
      expect(result.goals[0]).toHaveProperty("totalTarget");
      expect(result.goals[0]).toHaveProperty("totalActual");
      expect(result.goals[0]).toHaveProperty("currentBalance");
      expect(result.goals[0].totalActual).toBe(50);
    });

    test("deletedAtあり → stats=0で返す", async () => {
      const row = makeGoalRow({ deletedAt: NOW });
      const repo = createMockRepo({
        getGoalsByUserId: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.getGoals(USER_ID);

      expect(result.goals[0].currentBalance).toBe(0);
      expect(result.goals[0].totalTarget).toBe(0);
      expect(result.goals[0].totalActual).toBe(0);
      expect(repo.getGoalActualQuantity).not.toHaveBeenCalled();
    });

    test("sinceパラメータをrepoに渡す", async () => {
      const repo = createMockRepo();
      const usecase = newGoalV2Usecase(repo, noopTracer);

      await usecase.getGoals(USER_ID, "2025-06-01T00:00:00.000Z");

      expect(repo.getGoalsByUserId).toHaveBeenCalledWith(
        USER_ID,
        "2025-06-01T00:00:00.000Z",
      );
    });

    test("endDateが過去 → effectiveEndはendDate", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      try {
        const row = makeGoalRow({
          startDate: "2026-02-28",
          endDate: "2026-02-28",
          dailyTargetQuantity: "10",
        });
        const repo = createMockRepo({
          getGoalsByUserId: vi.fn().mockResolvedValue([row]),
          getGoalActualQuantity: vi.fn().mockResolvedValue(5),
        });
        const usecase = newGoalV2Usecase(repo, noopTracer);

        const result = await usecase.getGoals(USER_ID);

        // 1日間 × 10 = 10
        expect(result.goals[0].totalTarget).toBe(10);
        expect(result.goals[0].totalActual).toBe(5);
        expect(result.goals[0].currentBalance).toBe(-5);
        expect(repo.getGoalActualQuantity).toHaveBeenCalledWith(
          USER_ID,
          OWNED_ACTIVITY_ID,
          "2026-02-28",
          "2026-02-28",
        );
      } finally {
        vi.useRealTimers();
      }
    });

    test("endDate=null（無期限）→ endDateはtoday", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      try {
        const row = makeGoalRow({
          startDate: "2026-03-01",
          endDate: null,
          dailyTargetQuantity: "10",
        });
        const repo = createMockRepo({
          getGoalsByUserId: vi.fn().mockResolvedValue([row]),
          getGoalActualQuantity: vi.fn().mockResolvedValue(10),
        });
        const usecase = newGoalV2Usecase(repo, noopTracer);

        const result = await usecase.getGoals(USER_ID);

        // 1日間 × 10 = 10, actual=10 → balance=0
        expect(result.goals[0].totalTarget).toBe(10);
        expect(result.goals[0].totalActual).toBe(10);
        expect(result.goals[0].currentBalance).toBe(0);
        expect(repo.getGoalActualQuantity).toHaveBeenCalledWith(
          USER_ID,
          OWNED_ACTIVITY_ID,
          "2026-03-01",
          "2026-03-01",
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("syncGoals", () => {
    test("空配列 → 早期リターン", async () => {
      const repo = createMockRepo();
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.syncGoals(USER_ID, []);

      expect(result.syncedIds).toHaveLength(0);
      expect(result.serverWins).toHaveLength(0);
      expect(result.skippedIds).toHaveLength(0);
      expect(repo.upsertGoals).not.toHaveBeenCalled();
    });

    test("全件upsert成功 → syncedIdsに含まれる", async () => {
      const req = makeUpsertRequest();
      const row = makeGoalRow();
      const repo = createMockRepo({
        upsertGoals: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.syncGoals(USER_ID, [req as never]);

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
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.syncGoals(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(result.syncedIds).toHaveLength(0);
      expect(repo.upsertGoals).not.toHaveBeenCalled();
    });

    test("updatedAtが未来すぎる → skip", async () => {
      const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const req = makeUpsertRequest({ updatedAt: farFuture });
      const repo = createMockRepo();
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.syncGoals(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(repo.upsertGoals).not.toHaveBeenCalled();
    });

    test("upsertで返らなかったID → serverWinsとして返す", async () => {
      const req1 = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000001" });
      const req2 = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000002" });

      const row1 = makeGoalRow({ id: req1.id });
      const serverRow2 = makeGoalRow({ id: req2.id, description: "server ver" });

      const repo = createMockRepo({
        upsertGoals: vi.fn().mockResolvedValue([row1]),
        getGoalsByIds: vi.fn().mockResolvedValue([serverRow2]),
      });
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.syncGoals(USER_ID, [req1, req2] as never[]);

      expect(result.syncedIds).toContain(req1.id);
      expect(result.serverWins).toHaveLength(1);
      expect(result.serverWins[0].id).toBe(req2.id);
    });

    test("upsertで返らず、getByIdsでも見つからない → skippedIds", async () => {
      const req = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000099" });
      const repo = createMockRepo({
        upsertGoals: vi.fn().mockResolvedValue([]),
        getGoalsByIds: vi.fn().mockResolvedValue([]),
      });
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.syncGoals(USER_ID, [req as never]);

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

      const syncedRow = makeGoalRow({ id: reqSynced.id });
      const serverWinRow = makeGoalRow({ id: reqServerWin.id, description: "server" });

      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([OWNED_ACTIVITY_ID]),
        upsertGoals: vi.fn().mockResolvedValue([syncedRow]),
        getGoalsByIds: vi.fn().mockResolvedValue([serverWinRow]),
      });
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.syncGoals(
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
        const row = makeGoalRow();
        const repo = createMockRepo({
          upsertGoals: vi.fn().mockResolvedValue([row]),
        });
        const usecase = newGoalV2Usecase(repo, noopTracer);

        const result = await usecase.syncGoals(USER_ID, [req as never]);

        expect(result.skippedIds).toHaveLength(0);
        expect(repo.upsertGoals).toHaveBeenCalled();
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
        const usecase = newGoalV2Usecase(repo, noopTracer);

        const result = await usecase.syncGoals(USER_ID, [req as never]);

        expect(result.skippedIds).toContain(req.id);
        expect(repo.upsertGoals).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    test("deletedAt付きデータも正常に同期される", async () => {
      const req = makeUpsertRequest({ deletedAt: NOW.toISOString() });
      const row = makeGoalRow({ deletedAt: NOW });
      const repo = createMockRepo({
        upsertGoals: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newGoalV2Usecase(repo, noopTracer);

      const result = await usecase.syncGoals(USER_ID, [req as never]);

      expect(result.syncedIds).toContain(req.id);
    });
  });
});
