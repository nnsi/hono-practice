type Sortable<K extends string> = { [P in K]?: string | Date | null };

/** archivedAtの降順でソートする（新しいものが先頭） */
export function sortByArchivedAtDesc<T extends Sortable<"archivedAt">>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    const aVal = a.archivedAt;
    const bVal = b.archivedAt;
    if (!aVal && !bVal) return 0;
    if (!aVal) return 1;
    if (!bVal) return -1;
    const aStr = aVal instanceof Date ? aVal.toISOString() : aVal;
    const bStr = bVal instanceof Date ? bVal.toISOString() : bVal;
    return bStr.localeCompare(aStr);
  });
}

/** createdAtの降順でソートする（新しいものが先頭） */
export function sortByCreatedAtDesc<T extends Sortable<"createdAt">>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    const aVal = a.createdAt;
    const bVal = b.createdAt;
    if (!aVal && !bVal) return 0;
    if (!aVal) return 1;
    if (!bVal) return -1;
    const aStr = aVal instanceof Date ? aVal.toISOString() : aVal;
    const bStr = bVal instanceof Date ? bVal.toISOString() : bVal;
    return bStr.localeCompare(aStr);
  });
}
