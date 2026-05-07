import { beforeEach, describe, expect, it, vi } from "vitest";

import { invalidateSync } from "../core/syncState";
import { createSyncNotes } from "./createSyncNotes";

function createMockDeps() {
  return {
    getPendingSyncNotes: vi.fn().mockResolvedValue([]),
    postChunk: vi.fn().mockResolvedValue({
      syncedIds: [],
      skippedIds: [],
      serverWins: [],
    }),
    markNotesSynced: vi.fn().mockResolvedValue(undefined),
    markNotesFailed: vi.fn().mockResolvedValue(undefined),
    upsertNotesFromServer: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createSyncNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when no pending notes", async () => {
    const deps = createMockDeps();
    const syncNotes = createSyncNotes(deps);

    await syncNotes();

    expect(deps.markNotesSynced).not.toHaveBeenCalled();
    expect(deps.postChunk).not.toHaveBeenCalled();
  });

  it("strips _syncStatus before sending", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncNotes.mockResolvedValue([
      {
        id: "n1",
        userId: "u1",
        activityId: null,
        title: "Note 1",
        content: "Content",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: ["n1"],
      skippedIds: [],
      serverWins: [],
    });

    const syncNotes = createSyncNotes(deps);
    await syncNotes();

    const sentChunk = deps.postChunk.mock.calls[0][0];
    const sentNote = sentChunk[0];
    expect(sentNote).not.toHaveProperty("_syncStatus");
    expect(sentNote.id).toBe("n1");
    expect(sentNote.title).toBe("Note 1");
  });

  it("marks synced and failed ids", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncNotes.mockResolvedValue([
      { id: "n1", _syncStatus: "pending" },
    ]);

    const serverWin = {
      id: "n2",
      user_id: "u1",
      activity_id: null,
      title: "Server Note",
      content: "",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      deleted_at: null,
    };
    deps.postChunk.mockResolvedValue({
      syncedIds: ["n1"],
      skippedIds: ["n3"],
      serverWins: [serverWin],
    });

    const syncNotes = createSyncNotes(deps);
    await syncNotes();

    expect(deps.markNotesSynced).toHaveBeenCalledWith(["n1"]);
    expect(deps.markNotesFailed).toHaveBeenCalledWith(["n3"]);
    expect(deps.upsertNotesFromServer).toHaveBeenCalledTimes(1);
  });

  it("throws when postChunk throws", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncNotes.mockResolvedValue([
      { id: "n1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockRejectedValue(new Error("syncNotes failed: 500"));

    const syncNotes = createSyncNotes(deps);
    await expect(syncNotes()).rejects.toThrow("syncNotes failed");

    expect(deps.markNotesSynced).not.toHaveBeenCalled();
  });

  it("sends notes in chunks of 100", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `n-${i}`,
      _syncStatus: "pending",
    }));
    deps.getPendingSyncNotes.mockResolvedValue(pending);

    const syncNotes = createSyncNotes(deps);
    await syncNotes();

    expect(deps.postChunk).toHaveBeenCalledTimes(2);
    expect(deps.postChunk.mock.calls[0][0]).toHaveLength(100);
    expect(deps.postChunk.mock.calls[1][0]).toHaveLength(50);
  });

  it("processes serverWins per chunk", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 120 }, (_, i) => ({
      id: `n-${i}`,
      title: `Note ${i}`,
      _syncStatus: "pending",
    }));
    deps.getPendingSyncNotes.mockResolvedValue(pending);

    const sw1 = { id: "sw-1", title: "From Chunk 1" };
    const sw2 = { id: "sw-2", title: "From Chunk 2" };
    deps.postChunk
      .mockResolvedValueOnce({
        syncedIds: [],
        skippedIds: [],
        serverWins: [sw1],
      })
      .mockResolvedValueOnce({
        syncedIds: [],
        skippedIds: [],
        serverWins: [sw2],
      });

    const syncNotes = createSyncNotes(deps);
    await syncNotes();

    expect(deps.upsertNotesFromServer).toHaveBeenCalledTimes(2);
  });

  it("throws on second chunk failure but marks first chunk as synced", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `n-${i}`,
      title: `Note ${i}`,
      _syncStatus: "pending",
    }));
    deps.getPendingSyncNotes.mockResolvedValue(pending);

    const firstChunkIds = Array.from({ length: 100 }, (_, i) => `n-${i}`);
    deps.postChunk
      .mockResolvedValueOnce({
        syncedIds: firstChunkIds,
        skippedIds: [],
        serverWins: [],
      })
      .mockRejectedValueOnce(new Error("syncNotes failed: 500"));

    const syncNotes = createSyncNotes(deps);
    await expect(syncNotes()).rejects.toThrow("syncNotes failed");

    expect(deps.markNotesSynced).toHaveBeenCalledTimes(1);
    expect(deps.markNotesSynced).toHaveBeenCalledWith(firstChunkIds);
  });

  it("skips DB writes when sync generation changes", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncNotes.mockResolvedValue([
      { id: "n1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockImplementation(async () => {
      invalidateSync();
      return {
        syncedIds: ["n1"],
        skippedIds: [],
        serverWins: [{ id: "sw-1" }],
      };
    });

    const syncNotes = createSyncNotes(deps);
    await syncNotes();

    expect(deps.markNotesSynced).not.toHaveBeenCalled();
    expect(deps.upsertNotesFromServer).not.toHaveBeenCalled();
  });
});
