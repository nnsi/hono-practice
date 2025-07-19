import type React from "react";
import { useState } from "react";

import { TaskCreateDialog } from "@frontend/components/tasks/TaskCreateDialog";
import {
  useDeleteTask,
  useUpdateTask,
} from "@frontend/hooks/sync/useSyncedTask";
import {
  CheckCircledIcon,
  CircleIcon,
  PlusCircledIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import dayjs from "dayjs";

import type { GetTaskResponse } from "@dtos/response/GetTasksResponse";

import { Button, Card, CardContent } from "@components/ui";

interface TaskListProps {
  tasks: GetTaskResponse[] | undefined;
  isTasksLoading: boolean;
  date: Date;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  isTasksLoading,
  date,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const dateStr = dayjs(date).format("YYYY-MM-DD");

  // 同期対応のフックを使用
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // タスクの完了/未完了を切り替えるハンドラ
  const handleToggleTaskDone = (task: GetTaskResponse) => {
    updateTask.mutate({
      id: task.id,
      doneDate: task.doneDate ? null : dateStr,
      date: dateStr,
    });
  };

  // タスクを削除するハンドラ
  const handleDeleteTask = (e: React.MouseEvent, task: GetTaskResponse) => {
    e.stopPropagation();
    deleteTask.mutate({ id: task.id, date: dateStr });
  };

  return (
    <>
      <div className="flex-1 flex flex-col gap-4 px-4">
        <div className="flex flex-col-reverse gap-4">
          {tasks && tasks.length > 0 ? (
            tasks.map((task: GetTaskResponse) => (
              <Card
                key={task.id}
                className="cursor-pointer shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 h-20"
              >
                <CardContent className="flex items-center gap-4 p-0 px-4 h-full">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex items-center justify-center w-10 h-10 text-3xl bg-transparent border-none p-0 m-0"
                    onClick={() => handleToggleTaskDone(task)}
                  >
                    {task.doneDate ? (
                      <CheckCircledIcon className="text-green-500 w-8 h-8" />
                    ) : (
                      <CircleIcon className="text-gray-400 w-8 h-8" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <div className="text-lg font-semibold">{task.title}</div>
                    {task.memo && (
                      <div className="text-xs text-gray-500 mt-1">
                        {task.memo}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="ml-2 text-gray-400 hover:text-red-500 bg-transparent border-none p-0 m-0"
                    onClick={(e) => handleDeleteTask(e, task)}
                    disabled={deleteTask.isPending}
                    aria-label="タスク削除"
                  >
                    <TrashIcon className="w-6 h-6" />
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              {isTasksLoading ? "Loading..." : "タスクはありません"}
            </div>
          )}
        </div>
        <Card
          className="cursor-pointer shadow-sm rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md hover:border-gray-400 transition-all duration-200 group h-20"
          onClick={() => setCreateDialogOpen(true)}
        >
          <CardContent className="flex items-center justify-center gap-2 p-0 h-full">
            <PlusCircledIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            <span className="text-sm text-gray-500 group-hover:text-gray-700">
              新規タスクを追加
            </span>
          </CardContent>
        </Card>
      </div>

      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDate={date}
        onSuccess={() => {
          // 必要に応じてリフレッシュ処理を追加
        }}
      />
    </>
  );
};
