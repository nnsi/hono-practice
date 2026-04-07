import { useCallback, useState } from "react";

import { useActivities } from "../../hooks/useActivities";
import { useActiveNotes } from "../../hooks/useNotes";
import { noteRepository } from "../../repositories/noteRepository";
import { syncEngine } from "../../sync/syncEngine";

export function useNotesPage() {
  const { notes } = useActiveNotes();
  const { activities } = useActivities();
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

  return {
    notes: sortedNotes,
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
  };
}
