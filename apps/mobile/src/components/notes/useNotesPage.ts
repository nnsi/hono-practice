import { useCallback, useState } from "react";

import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type { Syncable } from "@packages/domain/sync/syncableRecord";

import { useActivities } from "../../hooks/useActivities";
import { useActiveNotes } from "../../hooks/useNotes";
import { noteRepository } from "../../repositories/noteRepository";
import { syncEngine } from "../../sync/syncEngine";

export function useNotesPage() {
  const { notes } = useActiveNotes();
  const { activities } = useActivities();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Syncable<NoteRecord> | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sortedNotes = [...notes].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  const getActivityName = useCallback(
    (activityId: string | null) => {
      if (!activityId) return null;
      return activities.find((a) => a.id === activityId)?.name ?? null;
    },
    [activities],
  );

  const handleDelete = useCallback(async (id: string) => {
    await noteRepository.softDeleteNote(id);
    setDeleteConfirmId(null);
    syncEngine.syncAll();
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setCreateDialogOpen(false);
    syncEngine.syncAll();
  }, []);

  const handleEditSuccess = useCallback(() => {
    setEditingNote(null);
    syncEngine.syncAll();
  }, []);

  return {
    notes: sortedNotes,
    activities,
    createDialogOpen,
    setCreateDialogOpen,
    editingNote,
    setEditingNote,
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
    handleCreateSuccess,
    handleEditSuccess,
  };
}
