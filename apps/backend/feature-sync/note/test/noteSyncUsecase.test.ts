import { noopTracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";
import { describe, expect, test, vi } from "vitest";

import type { NoteSyncRepository } from "../noteSyncRepository";
import { newNoteSyncUsecase } from "../noteSyncUsecase";

const USER_ID = "00000000-0000-4000-8000-000000000001" as UserId;
const OWNED_ACTIVITY_ID = "00000000-0000-4000-8000-000000000010";
const NOW = new Date();

function makeNoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    userId: USER_ID as string,
    activityId: null,
    title: "Test note",
    content: "# Hello",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function makeUpsertRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    activityId: null,
    title: "Test note",
    content: "# Hello",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function createMockRepo(
  overrides: Partial<NoteSyncRepository> = {},
): NoteSyncRepository {
  return {
    getNotesByUserId: vi.fn().mockResolvedValue([]),
    upsertNotes: vi.fn().mockResolvedValue([]),
    getNotesByIds: vi.fn().mockResolvedValue([]),
    getOwnedActivityIds: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("noteSyncUsecase", () => {
  describe("getNotes", () => {
    test("repoに委譲してnotes形式で返す", async () => {
      const rows = [
        makeNoteRow(),
        makeNoteRow({ id: "10000000-0000-4000-8000-000000000002" }),
      ];
      const repo = createMockRepo({
        getNotesByUserId: vi.fn().mockResolvedValue(rows),
      });
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.getNotes(USER_ID);

      expect(result.notes).toHaveLength(2);
      expect(repo.getNotesByUserId).toHaveBeenCalledWith(USER_ID, undefined);
    });

    test("sinceパラメータをrepoに渡す", async () => {
      const repo = createMockRepo();
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      await usecase.getNotes(USER_ID, "2025-01-01T00:00:00.000Z");

      expect(repo.getNotesByUserId).toHaveBeenCalledWith(
        USER_ID,
        "2025-01-01T00:00:00.000Z",
      );
    });
  });

  describe("syncNotes", () => {
    test("空配列 → 早期リターン", async () => {
      const repo = createMockRepo();
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, []);

      expect(result.syncedIds).toHaveLength(0);
      expect(result.serverWins).toHaveLength(0);
      expect(result.skippedIds).toHaveLength(0);
      expect(repo.upsertNotes).not.toHaveBeenCalled();
    });

    test("全件upsert成功 → syncedIdsに含まれる", async () => {
      const req = makeUpsertRequest();
      const row = makeNoteRow();
      const repo = createMockRepo({
        upsertNotes: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, [req as never]);

      expect(result.syncedIds).toContain(req.id);
      expect(result.serverWins).toHaveLength(0);
      expect(result.skippedIds).toHaveLength(0);
    });

    test("updatedAtが未来すぎる → skip", async () => {
      const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const req = makeUpsertRequest({ updatedAt: farFuture });
      const repo = createMockRepo();
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(result.syncedIds).toHaveLength(0);
      expect(repo.upsertNotes).not.toHaveBeenCalled();
    });

    test("updatedAtがちょうど5分先 → 許容される", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      try {
        const req = makeUpsertRequest({
          updatedAt: "2026-03-01T12:05:00.000Z",
        });
        const row = makeNoteRow();
        const repo = createMockRepo({
          upsertNotes: vi.fn().mockResolvedValue([row]),
        });
        const usecase = newNoteSyncUsecase(repo, noopTracer);

        const result = await usecase.syncNotes(USER_ID, [req as never]);

        expect(result.skippedIds).toHaveLength(0);
        expect(repo.upsertNotes).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    test("updatedAtが5分1ms先 → skip", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      try {
        const req = makeUpsertRequest({
          updatedAt: "2026-03-01T12:05:00.001Z",
        });
        const repo = createMockRepo();
        const usecase = newNoteSyncUsecase(repo, noopTracer);

        const result = await usecase.syncNotes(USER_ID, [req as never]);

        expect(result.skippedIds).toContain(req.id);
        expect(repo.upsertNotes).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    test("upsertで返らなかったID → serverWinsとして返す", async () => {
      const req1 = makeUpsertRequest({
        id: "10000000-0000-4000-8000-000000000001",
      });
      const req2 = makeUpsertRequest({
        id: "10000000-0000-4000-8000-000000000002",
      });

      const row1 = makeNoteRow({ id: req1.id });
      const serverRow2 = makeNoteRow({ id: req2.id, title: "Server version" });

      const repo = createMockRepo({
        upsertNotes: vi.fn().mockResolvedValue([row1]),
        getNotesByIds: vi.fn().mockResolvedValue([serverRow2]),
      });
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, [req1, req2] as never[]);

      expect(result.syncedIds).toContain(req1.id);
      expect(result.syncedIds).not.toContain(req2.id);
      expect(result.serverWins).toHaveLength(1);
      expect(result.serverWins[0].id).toBe(req2.id);
    });

    test("upsertで返らず、getNotesByIdsでも見つからない → skippedIds", async () => {
      const req = makeUpsertRequest({
        id: "10000000-0000-4000-8000-000000000099",
      });
      const repo = createMockRepo({
        upsertNotes: vi.fn().mockResolvedValue([]),
        getNotesByIds: vi.fn().mockResolvedValue([]),
      });
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(result.syncedIds).toHaveLength(0);
      expect(result.serverWins).toHaveLength(0);
    });

    test("混合: synced + serverWins + skipped", async () => {
      const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const reqSynced = makeUpsertRequest({
        id: "10000000-0000-4000-8000-000000000001",
      });
      const reqServerWin = makeUpsertRequest({
        id: "10000000-0000-4000-8000-000000000002",
      });
      const reqSkipped = makeUpsertRequest({
        id: "10000000-0000-4000-8000-000000000003",
        updatedAt: farFuture,
      });

      const syncedRow = makeNoteRow({ id: reqSynced.id });
      const serverWinRow = makeNoteRow({
        id: reqServerWin.id,
        title: "Server ver",
      });

      const repo = createMockRepo({
        upsertNotes: vi.fn().mockResolvedValue([syncedRow]),
        getNotesByIds: vi.fn().mockResolvedValue([serverWinRow]),
      });
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, [
        reqSynced,
        reqServerWin,
        reqSkipped,
      ] as never[]);

      expect(result.syncedIds).toContain(reqSynced.id);
      expect(result.serverWins).toHaveLength(1);
      expect(result.serverWins[0].id).toBe(reqServerWin.id);
      expect(result.skippedIds).toContain(reqSkipped.id);
    });

    test("deletedAt付きデータも正常に同期される", async () => {
      const req = makeUpsertRequest({ deletedAt: NOW.toISOString() });
      const row = makeNoteRow({ deletedAt: NOW });
      const repo = createMockRepo({
        upsertNotes: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, [req as never]);

      expect(result.syncedIds).toContain(req.id);
    });

    test("activityIdが他人のもの → skip", async () => {
      const otherActivityId = "00000000-0000-4000-8000-000000000099";
      const req = makeUpsertRequest({ activityId: otherActivityId });
      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([]),
      });
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, [req as never]);

      expect(result.skippedIds).toContain(req.id);
      expect(repo.upsertNotes).not.toHaveBeenCalled();
    });

    test("activityIdが自分のもの → 通過する", async () => {
      const req = makeUpsertRequest({ activityId: OWNED_ACTIVITY_ID });
      const row = makeNoteRow({ activityId: OWNED_ACTIVITY_ID });
      const repo = createMockRepo({
        getOwnedActivityIds: vi.fn().mockResolvedValue([OWNED_ACTIVITY_ID]),
        upsertNotes: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, [req as never]);

      expect(result.syncedIds).toContain(req.id);
      expect(result.skippedIds).toHaveLength(0);
    });

    test("activityId=null → getOwnedActivityIds未呼び出し", async () => {
      const req = makeUpsertRequest({ activityId: null });
      const row = makeNoteRow();
      const repo = createMockRepo({
        upsertNotes: vi.fn().mockResolvedValue([row]),
      });
      const usecase = newNoteSyncUsecase(repo, noopTracer);

      const result = await usecase.syncNotes(USER_ID, [req as never]);

      expect(result.syncedIds).toContain(req.id);
      expect(repo.getOwnedActivityIds).not.toHaveBeenCalled();
    });
  });
});
