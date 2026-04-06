import { AppError, ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import {
  type Note,
  type NoteId,
  createNoteEntity,
  createNoteId,
} from "@packages/domain/note/noteSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { NoteRepository } from ".";

export type CreateNoteInputParams = {
  title: string;
  content?: string;
  activityId?: string;
};

export type UpdateNoteInputParams = {
  title?: string;
  content?: string;
  activityId?: string | null;
};

export type NoteUsecase = {
  getNotes: (userId: UserId, activityId?: string) => Promise<Note[]>;
  getNote: (userId: UserId, noteId: NoteId) => Promise<Note>;
  createNote: (userId: UserId, params: CreateNoteInputParams) => Promise<Note>;
  updateNote: (
    userId: UserId,
    noteId: NoteId,
    params: UpdateNoteInputParams,
  ) => Promise<Note>;
  deleteNote: (userId: UserId, noteId: NoteId) => Promise<void>;
};

export function newNoteUsecase(
  repo: NoteRepository,
  tracer: Tracer,
): NoteUsecase {
  return {
    getNotes: getNotes(repo, tracer),
    getNote: getNote(repo, tracer),
    createNote: createNote(repo, tracer),
    updateNote: updateNote(repo, tracer),
    deleteNote: deleteNote(repo, tracer),
  };
}

function getNotes(repo: NoteRepository, tracer: Tracer) {
  return async (userId: UserId, activityId?: string) => {
    return await tracer.span("db.getNotesByUserId", () =>
      repo.getNotesByUserId(userId, activityId),
    );
  };
}

function getNote(repo: NoteRepository, tracer: Tracer) {
  return async (userId: UserId, noteId: NoteId) => {
    const note = await tracer.span("db.getNoteByUserIdAndNoteId", () =>
      repo.getNoteByUserIdAndNoteId(userId, noteId),
    );
    if (!note) throw new ResourceNotFoundError("note not found");

    return note;
  };
}

function createNote(repo: NoteRepository, tracer: Tracer) {
  return async (userId: UserId, params: CreateNoteInputParams) => {
    const activityIdForCreate = params.activityId;
    if (activityIdForCreate) {
      const owned = await tracer.span("db.getOwnedActivityIds", () =>
        repo.getOwnedActivityIds(userId, [activityIdForCreate]),
      );
      if (owned.length === 0) {
        throw new AppError("activityId does not belong to user", 400);
      }
    }

    const note = createNoteEntity({
      type: "new",
      id: createNoteId(),
      userId: userId,
      title: params.title,
      content: params.content ?? "",
      activityId: params.activityId,
    });

    return await tracer.span("db.createNote", () => repo.createNote(note));
  };
}

function updateNote(repo: NoteRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    noteId: NoteId,
    params: UpdateNoteInputParams,
  ) => {
    const activityIdForUpdate = params.activityId;
    if (activityIdForUpdate) {
      const owned = await tracer.span("db.getOwnedActivityIds", () =>
        repo.getOwnedActivityIds(userId, [activityIdForUpdate]),
      );
      if (owned.length === 0) {
        throw new AppError("activityId does not belong to user", 400);
      }
    }

    const note = await tracer.span("db.getNoteByUserIdAndNoteId", () =>
      repo.getNoteByUserIdAndNoteId(userId, noteId),
    );
    if (!note)
      throw new ResourceNotFoundError("updateNoteUsecase:note not found");

    const newNote = createNoteEntity({
      ...note,
      ...params,
    });

    const updatedNote = await tracer.span("db.updateNote", () =>
      repo.updateNote(newNote),
    );
    if (!updatedNote)
      throw new ResourceNotFoundError("updateNoteUsecase:note not found");

    return updatedNote;
  };
}

function deleteNote(repo: NoteRepository, tracer: Tracer) {
  return async (userId: UserId, noteId: NoteId) => {
    const note = await tracer.span("db.getNoteByUserIdAndNoteId", () =>
      repo.getNoteByUserIdAndNoteId(userId, noteId),
    );
    if (!note) throw new ResourceNotFoundError("note not found");

    await tracer.span("db.deleteNote", () => repo.deleteNote(note));

    return;
  };
}
