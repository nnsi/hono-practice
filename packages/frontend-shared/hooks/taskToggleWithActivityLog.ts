type ToggleableTask = {
  id: string;
  activityId: string | null;
  activityKindId: string | null;
  quantity: number | null;
  doneDate: string | null;
};

type TaskToggleDeps = {
  taskRepository: {
    updateTask: (
      id: string,
      data: { doneDate: string | null },
    ) => Promise<unknown>;
  };
  activityLogRepository: {
    createActivityLog: (input: {
      activityId: string;
      activityKindId: string | null;
      quantity: number | null;
      memo: string;
      date: string;
      time: string | null;
      taskId: string | null;
    }) => Promise<unknown>;
    softDeleteActivityLogByTaskId: (taskId: string) => Promise<void>;
  };
  syncEngine: {
    syncTasks: () => Promise<unknown>;
    syncActivityLogs: () => Promise<unknown>;
  };
};

function fireAndForget(sync: () => Promise<unknown>) {
  void sync().catch(() => {});
}

async function rollbackTaskToggle(
  deps: TaskToggleDeps,
  task: ToggleableTask,
  originalError: unknown,
) {
  try {
    await deps.taskRepository.updateTask(task.id, {
      doneDate: task.doneDate,
    });
  } catch (rollbackError) {
    throw new Error("Failed to rollback task toggle", {
      cause: {
        originalError,
        rollbackError,
      },
    });
  }
}

export async function toggleTaskWithActivityLog(
  deps: TaskToggleDeps,
  task: ToggleableTask,
  today: string,
) {
  const newDoneDate = task.doneDate ? null : today;
  const shouldCreateLog =
    !task.doneDate &&
    !!newDoneDate &&
    !!task.activityId &&
    task.quantity != null;
  const shouldDeleteLog = !!task.doneDate && !newDoneDate;

  await deps.taskRepository.updateTask(task.id, { doneDate: newDoneDate });

  try {
    if (shouldCreateLog) {
      const completedDate = newDoneDate ?? today;
      const activityId = task.activityId;
      const quantity = task.quantity;
      if (!activityId || quantity == null) {
        throw new Error("Task auto-log payload is incomplete");
      }
      await deps.activityLogRepository.createActivityLog({
        activityId,
        activityKindId: task.activityKindId ?? null,
        quantity,
        memo: "",
        date: completedDate,
        time: null,
        taskId: task.id,
      });
    }

    if (shouldDeleteLog) {
      await deps.activityLogRepository.softDeleteActivityLogByTaskId(task.id);
    }
  } catch (error) {
    await rollbackTaskToggle(deps, task, error);
    throw error;
  }

  fireAndForget(deps.syncEngine.syncTasks);
  if (shouldCreateLog || shouldDeleteLog) {
    fireAndForget(deps.syncEngine.syncActivityLogs);
  }
}
