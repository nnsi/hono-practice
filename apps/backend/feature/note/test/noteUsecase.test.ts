import { ResourceNotFoundError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";
import {
  type Note,
  type NoteId,
  createNoteId,
} from "@packages/domain/note/noteSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import { type NoteRepository, newNoteUsecase } from "..";

describe("NoteUsecase", () => {
  let repo: NoteRepository;
  let usecase: ReturnType<typeof newNoteUsecase>;

  beforeEach(() => {
    repo = mock<NoteRepository>();
    usecase = newNoteUsecase(instance(repo), noopTracer);
    reset(repo);
  });

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const noteId1 = createNoteId("00000000-0000-4000-8000-000000000001");
  const noteId2 = createNoteId("00000000-0000-4000-8000-000000000002");

  type NoteOverrides = {
    id?: NoteId;
    title?: string;
    content?: string;
    activityId?: string | null;
  };

  const makeNote = (overrides: NoteOverrides = {}): Note => ({
    id: noteId1,
    userId: userId1,
    title: "Test Note",
    content: "Test content",
    type: "new",
    ...overrides,
  });

  const makePersistedNote = (
    overrides: NoteOverrides & {
      createdAt?: Date;
      updatedAt?: Date;
      deletedAt?: Date | null;
    } = {},
  ): Note => ({
    id: noteId1,
    userId: userId1,
    title: "Test Note",
    content: "Test content",
    type: "persisted",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe("getNotes", () => {
    it("success", async () => {
      const mockNotes = [
        makeNote({ id: noteId1, title: "Note 1" }),
        makeNote({ id: noteId2, title: "Note 2" }),
      ];
      when(repo.getNotesByUserId(userId1, undefined)).thenResolve(mockNotes);

      const result = await usecase.getNotes(userId1);
      expect(result).toEqual(mockNotes);
      verify(repo.getNotesByUserId(userId1, undefined)).once();
    });

    it("failed / getNotesByUserId error", async () => {
      when(repo.getNotesByUserId(userId1, undefined)).thenReject(new Error());
      await expect(usecase.getNotes(userId1)).rejects.toThrow(Error);
      verify(repo.getNotesByUserId(userId1, undefined)).once();
    });
  });

  describe("getNote", () => {
    it("success", async () => {
      const note = makeNote();
      when(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).thenResolve(note);

      const result = await usecase.getNote(userId1, noteId1);
      expect(result).toEqual(note);
      verify(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).once();
    });

    it("failed / not found", async () => {
      when(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).thenResolve(
        undefined,
      );
      await expect(usecase.getNote(userId1, noteId1)).rejects.toThrow(
        ResourceNotFoundError,
      );
      verify(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).once();
    });

    it("failed / getNoteByUserIdAndNoteId error", async () => {
      when(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).thenReject(
        new Error(),
      );
      await expect(usecase.getNote(userId1, noteId1)).rejects.toThrow(Error);
      verify(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).once();
    });
  });

  describe("createNote", () => {
    it("success", async () => {
      const returnedNote = makeNote({ title: "New Note", content: "Content" });
      when(repo.createNote(anything())).thenResolve(returnedNote);

      const result = await usecase.createNote(userId1, {
        title: "New Note",
        content: "Content",
      });
      expect(result).toEqual(returnedNote);
      verify(repo.createNote(anything())).once();
    });

    it("failed / createNote error", async () => {
      when(repo.createNote(anything())).thenReject(new Error());
      await expect(
        usecase.createNote(userId1, { title: "New Note" }),
      ).rejects.toThrow(Error);
      verify(repo.createNote(anything())).once();
    });
  });

  describe("updateNote", () => {
    it("success", async () => {
      const existing = makePersistedNote({ title: "Old Title" });
      const updated = makePersistedNote({ title: "Updated Title" });

      when(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).thenResolve(
        existing,
      );
      when(repo.updateNote(anything())).thenResolve(updated);

      const result = await usecase.updateNote(userId1, noteId1, {
        title: "Updated Title",
      });
      expect(result).toEqual(updated);
      verify(repo.updateNote(anything())).once();
    });

    it("failed / not found", async () => {
      when(repo.getNoteByUserIdAndNoteId(userId1, noteId2)).thenResolve(
        undefined,
      );
      await expect(
        usecase.updateNote(userId1, noteId2, { title: "Updated" }),
      ).rejects.toThrow(ResourceNotFoundError);
      verify(repo.getNoteByUserIdAndNoteId(userId1, noteId2)).once();
    });

    it("failed / getNoteByUserIdAndNoteId error", async () => {
      when(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).thenReject(
        new Error(),
      );
      await expect(
        usecase.updateNote(userId1, noteId1, { title: "Updated" }),
      ).rejects.toThrow(Error);
      verify(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).once();
    });

    it("failed / updateNote error", async () => {
      const existing = makePersistedNote();
      when(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).thenResolve(
        existing,
      );
      when(repo.updateNote(anything())).thenReject(new Error());

      await expect(
        usecase.updateNote(userId1, noteId1, { title: "Updated" }),
      ).rejects.toThrow(Error);
      verify(repo.updateNote(anything())).once();
    });
  });

  describe("deleteNote", () => {
    it("success", async () => {
      const note = makeNote();
      when(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).thenResolve(note);
      when(repo.deleteNote(anything())).thenResolve();

      await usecase.deleteNote(userId1, noteId1);
      verify(repo.deleteNote(anything())).once();
      verify(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).once();
    });

    it("failed / not found", async () => {
      when(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).thenResolve(
        undefined,
      );
      await expect(usecase.deleteNote(userId1, noteId1)).rejects.toThrow(
        ResourceNotFoundError,
      );
      verify(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).once();
    });

    it("failed / deleteNote error", async () => {
      const note = makeNote();
      when(repo.getNoteByUserIdAndNoteId(userId1, noteId1)).thenResolve(note);
      when(repo.deleteNote(anything())).thenReject(new Error());

      await expect(usecase.deleteNote(userId1, noteId1)).rejects.toThrow(Error);
      verify(repo.deleteNote(anything())).once();
    });
  });
});
