import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import { getServerNowISOString } from "@packages/sync-engine";
import { v7 as uuidv7 } from "uuid";

import { filterSafeUpserts } from "./syncHelpers";

export type NoteDbAdapter = {
  getUserId(): Promise<string>;
  insert(note: Syncable<NoteRecord>): Promise<void>;
  getAll(
    filter: (n: Syncable<NoteRecord>) => boolean,
  ): Promise<Syncable<NoteRecord>[]>;
  getById(id: string): Promise<Syncable<NoteRecord> | undefined>;
  update(id: string, changes: Partial<Syncable<NoteRecord>>): Promise<void>;
  getByIds(ids: string[]): Promise<Syncable<NoteRecord>[]>;
  updateSyncStatus(ids: string[], status: SyncStatus): Promise<void>;
  bulkUpsertSynced(records: Syncable<NoteRecord>[]): Promise<void>;
};

type CreateNoteInput = {
  title: string;
  content?: string;
  activityId?: string | null;
};

type UpdateNoteInput = {
  title?: string;
  content?: string;
  activityId?: string | null;
};

export function newNoteRepository(adapter: NoteDbAdapter) {
  return {
    async createNote(input: CreateNoteInput) {
      const now = getServerNowISOString();
      const userId = await adapter.getUserId();
      const note: Syncable<NoteRecord> = {
        id: uuidv7(),
        userId,
        activityId: input.activityId ?? null,
        title: input.title,
        content: input.content ?? "",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "pending",
      };
      await adapter.insert(note);
      return note;
    },

    async getAllActiveNotes() {
      return adapter.getAll((n) => !n.deletedAt);
    },

    async getNotesByActivityId(activityId: string) {
      return adapter.getAll((n) => !n.deletedAt && n.activityId === activityId);
    },

    async getNoteById(id: string) {
      return adapter.getById(id);
    },

    async updateNote(id: string, changes: UpdateNoteInput) {
      const now = getServerNowISOString();
      await adapter.update(id, {
        ...changes,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async softDeleteNote(id: string) {
      const now = getServerNowISOString();
      await adapter.update(id, {
        deletedAt: now,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async getPendingSyncNotes() {
      return adapter.getAll(
        (n) => n._syncStatus === "pending" || n._syncStatus === "failed",
      );
    },

    async markNotesSynced(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "synced");
    },

    async markNotesFailed(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "failed");
    },

    async upsertNotesFromServer(notes: NoteRecord[]) {
      if (notes.length === 0) return;
      const localRecords = await adapter.getByIds(notes.map((n) => n.id));
      const safe = filterSafeUpserts(notes, localRecords);
      if (safe.length === 0) return;
      await adapter.bulkUpsertSynced(
        safe.map((n) => ({ ...n, _syncStatus: "synced" as const })),
      );
    },
  };
}
