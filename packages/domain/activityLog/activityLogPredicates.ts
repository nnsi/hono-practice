type LogFields = {
  date: string;
  deletedAt?: string | null;
  activityId: string;
};

export function isActiveLog(log: Pick<LogFields, "deletedAt">): boolean {
  return !log.deletedAt;
}

export function filterLogsByDateRange<
  T extends Pick<LogFields, "date">,
>(logs: T[], from: string, to: string): T[] {
  return logs.filter((log) => log.date >= from && log.date <= to);
}

export function filterLogsByActivity<
  T extends Pick<LogFields, "activityId">,
>(logs: T[], activityId: string): T[] {
  return logs.filter((log) => log.activityId === activityId);
}

export function sumQuantity(
  logs: { quantity: number | null }[],
): number {
  return logs.reduce((sum, log) => sum + (log.quantity ?? 0), 0);
}
