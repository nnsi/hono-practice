import { useEffect, useMemo, useState } from "react";

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

  const usedActivityIds = useMemo(() => {
    const ids = new Set<string>();
    for (const note of notes) {
      if (note.activityId) ids.add(note.activityId);
    }
    return ids;
  }, [notes]);

  // 選択中の activity が notes から消えたら自動リセット。
  // Why: フィルタチップは「使われている activity のみ」表示する仕様のため、
  // stale な selectedActivityId のままだと UI でフィルタ解除する手段がなくなる。
  useEffect(() => {
    if (
      selectedActivityId !== null &&
      !usedActivityIds.has(selectedActivityId)
    ) {
      setSelectedActivityId(null);
    }
  }, [selectedActivityId, usedActivityIds]);

  // Why: useEffect の自動リセットは 1 frame 遅れるため、その間に「stale な activity で
  // 0 件絞り込まれた状態」が一瞬表示される。derived state で stale を無視することで防ぐ。
  const effectiveActivityId =
    selectedActivityId !== null && usedActivityIds.has(selectedActivityId)
      ? selectedActivityId
      : null;

  const filteredNotes = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return notes.filter((note) => {
      if (
        effectiveActivityId !== null &&
        note.activityId !== effectiveActivityId
      ) {
        return false;
      }
      if (q.length > 0) {
        const haystack = `${note.title} ${note.content}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [notes, searchText, effectiveActivityId]);

  const groupedNotes = useMemo(
    () => groupNotesByDate(filteredNotes),
    [filteredNotes],
  );

  const hasActiveFilter =
    searchText.trim().length > 0 || effectiveActivityId !== null;

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
