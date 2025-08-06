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

  return createUseTaskGroup(dependencies);
};
