type PendingLog = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  date: string;
  createdAt: string;
  deletedAt: string | null;
};

type ActivityWithMode = {
  id: string;
  recordingMode: string;
};

type UpdateChanges = {
  quantity: number;
  updatedAt: string;
  _syncStatus: "pending";
};

/**
 * バイナリモードのActivityLogを(date + activityId + activityKindId)で集約する。
 * 同期前にローカルDBで実行し、ログテーブルの肥大化を防ぐ。
 */
export async function aggregateBinaryLogs(
  getPendingLogs: () => Promise<PendingLog[]>,
  getActivities: () => Promise<ActivityWithMode[]>,
  updateLog: (id: string, changes: UpdateChanges) => Promise<unknown>,
  deleteLogs: (ids: string[]) => Promise<unknown>,
): Promise<void> {
  const pending = await getPendingLogs();
  if (pending.length === 0) return;

  const activities = await getActivities();
  const binaryActivityIds = new Set(
    activities.filter((a) => a.recordingMode === "binary").map((a) => a.id),
  );

  const binaryLogs = pending.filter(
    (l) => binaryActivityIds.has(l.activityId) && !l.deletedAt,
  );
  if (binaryLogs.length === 0) return;

  const groups = new Map<string, PendingLog[]>();
  for (const log of binaryLogs) {
    const key = `${log.date}|${log.activityId}|${log.activityKindId ?? ""}`;
    const group = groups.get(key) || [];
    group.push(log);
    groups.set(key, group);
  }

  for (const [, group] of groups) {
    if (group.length <= 1) continue;

    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const keeper = group[0];
    const rest = group.slice(1);
    const totalQuantity = group.reduce((sum, l) => sum + (l.quantity ?? 0), 0);

    await updateLog(keeper.id, {
      quantity: totalQuantity,
      updatedAt: new Date().toISOString(),
      _syncStatus: "pending",
    });

    await deleteLogs(rest.map((l) => l.id));
  }
}
