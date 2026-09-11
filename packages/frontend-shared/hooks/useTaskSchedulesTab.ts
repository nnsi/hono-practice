import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";

import { sortTaskSchedules } from "./taskScheduleSummary";
import type { ReactHooks } from "./types";

export type UseTaskSchedulesTabDeps = {
  react: Pick<ReactHooks, "useState" | "useMemo">;
  /** 未削除のスケジュールすべて（一時停止中を含む）。useLiveQuery で購読する */
  useAllTaskSchedules: () => { schedules: TaskScheduleRecord[] };
  taskScheduleRepository: {
    updateTaskSchedule: (
      id: string,
      changes: { isActive: boolean },
    ) => Promise<unknown>;
    softDeleteTaskSchedule: (id: string) => Promise<unknown>;
  };
  syncEngine: { syncTaskSchedules: () => Promise<unknown> };
};

/**
 * 「繰り返し」タブのロジック: 一覧（稼働中を先に）・一時停止/再開・削除（2 段階確認）・編集対象の選択。
 * 編集フォーム自体は `useTaskScheduleEditDialog` が担う。
 * 完了済み Task 行はスケジュール削除後もそのまま残る（カスケードしない。ADR 2026-09-10）。
 */
export function createUseTaskSchedulesTab(deps: UseTaskSchedulesTabDeps) {
  const {
    react: { useState, useMemo },
    useAllTaskSchedules,
    taskScheduleRepository,
    syncEngine,
  } = deps;

  const syncInBackground = () =>
    void syncEngine.syncTaskSchedules().catch(() => {});

  return function useTaskSchedulesTab() {
    const { schedules: rawSchedules } = useAllTaskSchedules();
    const [editingSchedule, setEditingSchedule] =
      useState<TaskScheduleRecord | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    // 同一スケジュールへの連打抑止（一時停止トグル・削除で共有）
    const pendingIds = useMemo(() => new Set<string>(), []);

    const schedules = useMemo(
      () => sortTaskSchedules(rawSchedules),
      [rawSchedules],
    );
    const deleteTarget = useMemo(
      () =>
        deleteConfirmId
          ? (schedules.find((s) => s.id === deleteConfirmId) ?? null)
          : null,
      [schedules, deleteConfirmId],
    );

    const withPending = async (id: string, run: () => Promise<void>) => {
      if (pendingIds.has(id)) return;
      pendingIds.add(id);
      try {
        await run();
      } finally {
        pendingIds.delete(id);
      }
    };

    const handleToggleActive = (schedule: TaskScheduleRecord) =>
      withPending(schedule.id, async () => {
        await taskScheduleRepository.updateTaskSchedule(schedule.id, {
          isActive: !schedule.isActive,
        });
        syncInBackground();
      });

    const handleDelete = (id: string) =>
      withPending(id, async () => {
        await taskScheduleRepository.softDeleteTaskSchedule(id);
        setDeleteConfirmId(null);
        syncInBackground();
      });

    const handleEditSuccess = () => setEditingSchedule(null);

    return {
      schedules,
      editingSchedule,
      setEditingSchedule,
      deleteConfirmId,
      setDeleteConfirmId,
      deleteTarget,
      handleToggleActive,
      handleDelete,
      handleEditSuccess,
    };
  };
}
