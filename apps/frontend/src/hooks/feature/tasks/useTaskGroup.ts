import { useArchiveTask, useUpdateTask } from "@frontend/hooks/api/useTasks";
import { createUseTaskGroup } from "@packages/frontend-shared/hooks/feature";

export type { TaskItem } from "@packages/frontend-shared/hooks/feature";

export const useTaskGroup = () => {
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();

  const dependencies = {
    updateTask,
    archiveTask,
  };

  const { stateProps, actions } = createUseTaskGroup(dependencies);

  // 後方互換性を維持しながら新しいAPIも公開
  return {
    ...stateProps,
    // 旧API互換のセッター
    setEditDialogOpen: actions.onEditDialogOpenChange,
    // アクションを旧名でエクスポート
    handleToggleTaskDone: actions.onToggleTaskDone,
    handleMoveToToday: actions.onMoveToToday,
    handleArchiveTask: actions.onArchiveTask,
    handleTaskClick: actions.onTaskClick,
    handleDialogSuccess: actions.onDialogSuccess,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
