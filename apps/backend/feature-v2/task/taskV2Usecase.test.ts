import { noopTracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";
import { describe, expect, test, vi } from "vitest";

import type { TaskV2Repository } from "./taskV2Repository";
import { newTaskV2Usecase } from "./taskV2Usecase";

const USER_ID = "00000000-0000-4000-8000-000000000001" as UserId;
const NOW = new Date();

function makeTaskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    userId: USER_ID as string,
    title: "Test task",
    startDate: null,
    dueDate: null,
    doneDate: null,
    memo: "",
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function makeUpsertRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    title: "Test task",
    startDate: null,
    dueDate: null,
    doneDate: null,
    memo: "",
    archivedAt: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function createMockRepo(
  overrides: Partial<TaskV2Repository> = {},
): TaskV2Repository {
  return {
    getTasksByUserId: vi.fn().mockResolvedValue([]),
    upsertTasks: vi.fn().mockResolvedValue([]),
    getTasksByIds: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("taskV2Usecase", () => {
  describe("getTasks", () => {
    test("repoに委譲してtasks形式で返す", async () => {
      const rows = [makeTaskRow(), makeTaskRow({ id: "10000000-0000-4000-8000-000000000002" })];
      const repo = createMockRepo({
        getTasksByUserId: vi.fn().mockResolvedValue(rows),
      });
      const usecase = newTaskV2Usecase(repo, noopTracer);

      const result = await usecase.getTasks(USER_ID);

      expect(result.tasks).toHaveLength(2);
      expect(repo.getTasksByUserId).toHaveBeenCalledWith(USER_ID, undefined);
    });

    test("sinceパラメータをrepoに渡す", async () => {
      const repo = createMockRepo();
      const usecase = newTaskV2Usecase(repo, noopTracer);

      await usecase.getTasks(USER_ID, "2025-01-01T00:00:00.000Z");

      expect(repo.getTasksByUserId).toHaveBeenCalledWith(
        USER_ID,
        "2025-01-01T00:00:00.000Z",
      );
    });
  });

  describe("syncTasks", () => {
    test("空配列 → 早期リターン", async () => {
      const repo = createMockRepo();
      const usecase = newTaskV2Usecase(repo, noopTracer);

      const result = await usecase.syncTasks(USER_ID, []);

      expect(result.syncedIds).toHaveLength(0);
      expect(result.serverWins).toHaveLength(0);
      expect(result.skippedIds).toHaveLength(0);
      expect(repo.upsertTasks).not.toHaveBeenCalled();
    });

    test("全件upsert成功 → syncedIdsに含まれる", async () => {
      const req = makeUpsertRequest();
      const row = makeTaskRow();
      const repo = createMockRepo({
        upsertTasks: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newTaskV2Usecase(repo, noopTracer);

      const result = await usecase.syncTasks(USER_ID, [req as never]);

      expect(result.syncedIds).toContain(req.id);
      expect(result.serverWins).toHaveLength(0);
      expect(result.skippedIds).toHaveLength(0);
    });

    test("updatedAtが未来すぎる → skip", async () => {
      const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const req = makeUpsertRequest({ updatedAt: farFuture });
      const repo = createMockRepo();
      const usecase = newTaskV2Usecase(repo, noopTracer);

      const result = await usecase.syncTasks(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(result.syncedIds).toHaveLength(0);
      expect(repo.upsertTasks).not.toHaveBeenCalled();
    });

    test("upsertで返らなかったID → serverWinsとして返す", async () => {
      const req1 = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000001" });
      const req2 = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000002" });

      const row1 = makeTaskRow({ id: req1.id });
      const serverRow2 = makeTaskRow({ id: req2.id, title: "Server version" });

      const repo = createMockRepo({
        upsertTasks: vi.fn().mockResolvedValue([row1]),
        getTasksByIds: vi.fn().mockResolvedValue([serverRow2]),
      });
      const usecase = newTaskV2Usecase(repo, noopTracer);

      const result = await usecase.syncTasks(USER_ID, [req1, req2] as never[]);

      expect(result.syncedIds).toContain(req1.id);
      expect(result.syncedIds).not.toContain(req2.id);
      expect(result.serverWins).toHaveLength(1);
      expect(result.serverWins[0].id).toBe(req2.id);
    });

    test("upsertで返らず、getTasksByIdsでも見つからない → skippedIds", async () => {
      const req = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000099" });
      const repo = createMockRepo({
        upsertTasks: vi.fn().mockResolvedValue([]),
        getTasksByIds: vi.fn().mockResolvedValue([]),
      });
      const usecase = newTaskV2Usecase(repo, noopTracer);

      const result = await usecase.syncTasks(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(result.syncedIds).toHaveLength(0);
      expect(result.serverWins).toHaveLength(0);
    });

    test("混合: synced + serverWins + skipped", async () => {
      const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const reqSynced = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000001" });
      const reqServerWin = makeUpsertRequest({ id: "10000000-0000-4000-8000-000000000002" });
      const reqSkipped = makeUpsertRequest({
        id: "10000000-0000-4000-8000-000000000003",
        updatedAt: farFuture,
      });

      const syncedRow = makeTaskRow({ id: reqSynced.id });
      const serverWinRow = makeTaskRow({ id: reqServerWin.id, title: "Server ver" });

      const repo = createMockRepo({
        upsertTasks: vi.fn().mockResolvedValue([syncedRow]),
        getTasksByIds: vi.fn().mockResolvedValue([serverWinRow]),
      });
      const usecase = newTaskV2Usecase(repo, noopTracer);

      const result = await usecase.syncTasks(
        USER_ID,
        [reqSynced, reqServerWin, reqSkipped] as never[],
      );

      expect(result.syncedIds).toContain(reqSynced.id);
      expect(result.serverWins).toHaveLength(1);
      expect(result.serverWins[0].id).toBe(reqServerWin.id);
      expect(result.skippedIds).toContain(reqSkipped.id);
    });

    test("updatedAtがちょうど5分先 → 許容される", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      try {
        const req = makeUpsertRequest({ updatedAt: "2026-03-01T12:05:00.000Z" });
        const row = makeTaskRow();
        const repo = createMockRepo({
          upsertTasks: vi.fn().mockResolvedValue([row]),
        });
        const usecase = newTaskV2Usecase(repo, noopTracer);

        const result = await usecase.syncTasks(USER_ID, [req as never]);

        expect(result.skippedIds).toHaveLength(0);
        expect(repo.upsertTasks).toHaveBeenCalled();
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
        const usecase = newTaskV2Usecase(repo, noopTracer);

        const result = await usecase.syncTasks(USER_ID, [req as never]);

        expect(result.skippedIds).toContain(req.id);
        expect(repo.upsertTasks).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    test("deletedAt付きデータも正常に同期される", async () => {
      const req = makeUpsertRequest({ deletedAt: NOW.toISOString() });
      const row = makeTaskRow({ deletedAt: NOW });
      const repo = createMockRepo({
        upsertTasks: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newTaskV2Usecase(repo, noopTracer);

      const result = await usecase.syncTasks(USER_ID, [req as never]);

      expect(result.syncedIds).toContain(req.id);
    });
  });
});
