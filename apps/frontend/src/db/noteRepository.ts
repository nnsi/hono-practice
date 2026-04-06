import {
  type NoteDbAdapter,
  newNoteRepository,
} from "@packages/frontend-shared/repositories";

import { db } from "./schema";

const adapter: NoteDbAdapter = {
  async getUserId() {
    const authState = await db.authState.get("current");
    if (!authState?.userId) {
      throw new Error("Cannot create note: userId is not set");
    }
    return authState.userId;
  },
  async insert(note) {
    await db.notes.add(note);
  },
  async getAll(filter) {
    return db.notes.filter(filter).toArray();
  },
  async getById(id) {
    const result = await db.notes.get(id);
    return result ?? undefined;
  },
  async update(id, changes) {
    await db.notes.update(id, changes);
  },
  async getByIds(ids) {
    return db.notes.where("id").anyOf(ids).toArray();
  },
  async updateSyncStatus(ids, status) {
    await db.notes.where("id").anyOf(ids).modify({ _syncStatus: status });
  },
  async bulkUpsertSynced(records) {
    await db.notes.bulkPut(records);
  },
};

export const noteRepository = newNoteRepository(adapter);
