/** その日のアクティビティ別の記録件数と数量合計（数量の無い記録だけなら total は null） */
export type ActivityDaySummary = { count: number; total: number | null };

/** 1 日分のログをアクティビティ別に集計する。 */
export function summarizeLogsByActivity(
  logs: readonly { activityId: string; quantity: number | null }[],
): Map<string, ActivityDaySummary> {
  const map = new Map<string, ActivityDaySummary>();
  for (const log of logs) {
    const prev = map.get(log.activityId) ?? { count: 0, total: null };
    map.set(log.activityId, {
      count: prev.count + 1,
      total:
        log.quantity === null ? prev.total : (prev.total ?? 0) + log.quantity,
    });
  }
  return map;
}

/**
 * カードに出すその日の状況。未記録なら null、数量があれば合計、
 * 数量の無い記録だけなら件数（×n）を返す。
 */
export function formatActivityDaySummary(
  summary: ActivityDaySummary | undefined,
  formatQuantity: (total: number) => string,
): string | null {
  if (!summary || summary.count === 0) return null;
  if (summary.total === null) return `×${summary.count}`;
  return formatQuantity(summary.total);
}
