export function sortByOrderIndex<
  T extends { orderIndex?: string | null },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (!a.orderIndex && !b.orderIndex) return 0;
    if (!a.orderIndex) return 1;
    if (!b.orderIndex) return -1;
    return a.orderIndex.localeCompare(b.orderIndex);
  });
}
