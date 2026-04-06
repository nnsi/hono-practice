import type { NoteId } from "@packages/domain/note/noteSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  CreateNoteRequest,
  UpdateNoteRequest,
} from "@packages/types/request";
import {
  GetNoteResponseSchema,
  GetNotesResponseSchema,
} from "@packages/types/response";

import { AppError } from "../../error";
import type { NoteUsecase } from ".";

export function newNoteHandler(uc: NoteUsecase) {
  return {
    getNotes: getNotes(uc),
    getNote: getNote(uc),
    createNote: createNote(uc),
    updateNote: updateNote(uc),
    deleteNote: deleteNote(uc),
  };
}

function getNotes(uc: NoteUsecase) {
  return async (userId: UserId, activityId?: string) => {
    const notes = await uc.getNotes(userId, activityId);

    const responseNotes = notes.map((note) => ({
      ...note,
      id: note.id,
      userId: note.userId,
    }));

    const parsedNotes = GetNotesResponseSchema.safeParse(responseNotes);
    if (!parsedNotes.success) {
      throw new AppError("getNotesHandler: failed to parse notes", 500);
    }

    return parsedNotes.data;
  };
}

function getNote(uc: NoteUsecase) {
  return async (userId: UserId, noteId: NoteId) => {
    const note = await uc.getNote(userId, noteId);

    const responseNote = {
      ...note,
      id: note.id,
      userId: note.userId,
    };

    const parsedNote = GetNoteResponseSchema.safeParse(responseNote);
    if (!parsedNote.success) {
      throw new AppError("getNoteHandler: failed to parse note", 500);
    }

    return parsedNote.data;
  };
}

function createNote(uc: NoteUsecase) {
  return async (userId: UserId, params: CreateNoteRequest) => {
    const note = await uc.createNote(userId, params);

    const parsedNote = GetNoteResponseSchema.safeParse(note);
    if (!parsedNote.success) {
      throw new AppError("createNoteHandler: failed to parse note", 500);
    }

    return parsedNote.data;
  };
}

function updateNote(uc: NoteUsecase) {
  return async (userId: UserId, noteId: NoteId, params: UpdateNoteRequest) => {
    const note = await uc.updateNote(userId, noteId, params);

    const responseNote = {
      ...note,
      id: note.id,
      userId: note.userId,
    };

    const parsedNote = GetNoteResponseSchema.safeParse(responseNote);
    if (!parsedNote.success) {
      throw new AppError("updateNoteHandler: failed to parse note", 500);
    }

    return parsedNote.data;
  };
}

function deleteNote(uc: NoteUsecase) {
  return async (userId: UserId, noteId: NoteId) => {
    await uc.deleteNote(userId, noteId);

    return { message: "success" };
  };
}
