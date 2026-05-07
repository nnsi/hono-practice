import { useCallback, useMemo, useState } from "react";

import { useNoteListFilter } from "@packages/frontend-shared/hooks";

import { useActivities } from "../../hooks/useActivities";
import { useActiveNotes } from "../../hooks/useNotes";
import { noteRepository } from "../../repositories/noteRepository";
import { syncEngine } from "../../sync/syncEngine";

export function useNotesPage() {
  const { notes } = useActiveNotes();
  const { activities } = useActivities();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );

  const {
    searchText,
    setSearchText,
    selectedActivityId,
    setSelectedActivityId,
    filteredNotes,
    groupedNotes,
    hasActiveFilter,
    totalCount,
  } = useNoteListFilter(sortedNotes);

  const filterActivities = useMemo(() => {
    const usedActivityIds = new Set<string>();
    for (const note of sortedNotes) {
      if (note.activityId) usedActivityIds.add(note.activityId);
    }
    return activities.filter((a) => usedActivityIds.has(a.id));
  }, [activities, sortedNotes]);

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

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => {
      if (prev) setSearchText("");
      return !prev;
    });
  }, [setSearchText]);

  const clearSearch = useCallback(() => {
    setSearchText("");
  }, [setSearchText]);

  return {
    notesList: sortedNotes,
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
    // filter state
    searchText,
    setSearchText,
    selectedActivityId,
    setSelectedActivityId,
    filteredNotes,
    groupedNotes,
    hasActiveFilter,
    totalCount,
    isSearchOpen,
    toggleSearch,
    clearSearch,
    filterActivities,
  };
}
