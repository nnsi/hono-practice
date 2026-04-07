import { useCallback, useState } from "react";

import { useLiveQuery } from "dexie-react-hooks";

import { noteRepository } from "../../db/noteRepository";
import { useActivities } from "../../hooks/useActivities";
import { syncEngine } from "../../sync/syncEngine";

export function useNotesPage() {
  const notes = useLiveQuery(() =>
    noteRepository
      .getAllActiveNotes()
      .then((arr) => arr.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))),
  );
  const { activities } = useActivities();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getActivityName = useCallback(
    (activityId: string | null) => {
      if (!activityId) return null;
      return activities.find((a) => a.id === activityId)?.name ?? null;
    },
    [activities],
  );

  const handleDelete = async (id: string) => {
    await noteRepository.softDeleteNote(id);
    setDeleteConfirmId(null);
    syncEngine.syncNotes();
  };

  return {
    notes: notes ?? [],
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
  };
}
