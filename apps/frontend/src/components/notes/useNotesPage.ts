import { useState } from "react";

import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { useLiveQuery } from "dexie-react-hooks";

import { noteRepository } from "../../db/noteRepository";

export function useNotesPage() {
  const notes = useLiveQuery(() =>
    noteRepository
      .getAllActiveNotes()
      .then((arr) => arr.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))),
  );

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Syncable<NoteRecord> | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await noteRepository.softDeleteNote(id);
    setDeleteConfirmId(null);
  };

  return {
    notes: notes ?? [],
    createDialogOpen,
    setCreateDialogOpen,
    editingNote,
    setEditingNote,
    deleteConfirmId,
    setDeleteConfirmId,
    handleDelete,
  };
}
