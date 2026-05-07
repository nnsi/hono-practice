import { useCallback, useMemo, useState } from "react";

import { useNoteListFilter } from "@packages/frontend-shared/hooks/useNoteListFilter";
import { useLiveQuery } from "dexie-react-hooks";

import { noteRepository } from "../../db/noteRepository";
import { useActivities } from "../../hooks/useActivities";
import { syncEngine } from "../../sync/syncEngine";

export function useNotesPage() {
  const notes = useLiveQuery(() =>
    noteRepository
      .getAllActiveNotes()
      .then((arr) =>
        arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      ),
  );
  const { activities } = useActivities();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const notesList = useMemo(() => notes ?? [], [notes]);

  const {
    searchText,
    setSearchText,
    selectedActivityId,
    setSelectedActivityId,
    filteredNotes,
    groupedNotes,
    hasActiveFilter,
    totalCount,
  } = useNoteListFilter(notesList);

  const usedActivityIds = useMemo(() => {
    const ids = new Set<string>();
    for (const note of notesList) {
      if (note.activityId) ids.add(note.activityId);
    }
    return ids;
  }, [notesList]);

  const filterActivities = useMemo(
    () => activities.filter((a) => usedActivityIds.has(a.id)),
    [activities, usedActivityIds],
  );

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
    notes: notesList,
    totalCount,
    filteredNotes,
    groupedNotes,
    hasActiveFilter,
    searchText,
    setSearchText,
    selectedActivityId,
    setSelectedActivityId,
    filterActivities,
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
  };
}
