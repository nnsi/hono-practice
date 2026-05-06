import { useMemo, useState } from "react";

import { type GroupedNotes, groupNotesByDate } from "../utils/noteGrouping";

type FilterableNote = {
  id: string;
  title: string;
  content: string;
  activityId: string | null;
  updatedAt: string;
};

export type UseNoteListFilterResult<T extends FilterableNote> = {
  searchText: string;
  setSearchText: (text: string) => void;
  selectedActivityId: string | null;
  setSelectedActivityId: (id: string | null) => void;
  filteredNotes: T[];
  groupedNotes: GroupedNotes<T>;
  hasActiveFilter: boolean;
  totalCount: number;
};

export function useNoteListFilter<T extends FilterableNote>(
  notes: T[],
): UseNoteListFilterResult<T> {
  const [searchText, setSearchText] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );

  const filteredNotes = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return notes.filter((note) => {
      if (
        selectedActivityId !== null &&
        note.activityId !== selectedActivityId
      ) {
        return false;
      }
      if (q.length > 0) {
        const haystack = `${note.title} ${note.content}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [notes, searchText, selectedActivityId]);

  const groupedNotes = useMemo(
    () => groupNotesByDate(filteredNotes),
    [filteredNotes],
  );

  const hasActiveFilter =
    searchText.trim().length > 0 || selectedActivityId !== null;

  return {
    searchText,
    setSearchText,
    selectedActivityId,
    setSelectedActivityId,
    filteredNotes,
    groupedNotes,
    hasActiveFilter,
    totalCount: notes.length,
  };
}
