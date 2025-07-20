import type React from "react";

import { TaskCreateDialog } from "@frontend/components/tasks/TaskCreateDialog";
import { TaskEditDialog } from "@frontend/components/tasks/TaskEditDialog";
import { useTaskActions } from "@frontend/hooks/feature/tasks/useTaskActions";
import {
  ArchiveIcon,
  CheckCircledIcon,
  CircleIcon,
  PlusCircledIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

import { Button, Card, CardContent } from "@components/ui";

type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

interface TaskListProps {
  tasks: TaskItem[] | undefined;
  isTasksLoading: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  isTasksLoading,
}) => {
  const {
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    selectedTask,
    handleToggleTaskDone,
    handleDeleteTask,
    handleArchiveTask,
    handleStartEdit,
    handleEditDialogClose,
    formatDate,
    deleteTaskPending,
    archiveTaskPending,
  } = useTaskActions();

  return (
    <>
      <div className="flex-1 flex flex-col gap-4">
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

        <div className="flex flex-col gap-4">
          {tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <Card
                key={task.id}
                className="cursor-pointer shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex items-center justify-center w-10 h-10 text-3xl bg-transparent border-none p-0 m-0 hover:bg-gray-100 rounded-full transition-colors"
                    onClick={() => handleToggleTaskDone(task)}
                  >
                    {task.doneDate ? (
                      <CheckCircledIcon className="text-green-500 w-8 h-8 hover:text-green-600 transition-colors" />
                    ) : (
                      <CircleIcon className="text-gray-400 w-8 h-8 hover:text-gray-600 transition-colors" />
                    )}
                  </Button>
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleStartEdit(task)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStartEdit(task);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="text-lg font-semibold">{task.title}</div>
                    <div className="flex gap-4 text-xs text-gray-500 mt-1">
                      {task.startDate && (
                        <span>開始: {formatDate(task.startDate)}</span>
                      )}
                      {task.dueDate && (
                        <span>期限: {formatDate(task.dueDate)}</span>
                      )}
                      {task.doneDate && (
                        <span className="text-green-600">
                          完了: {formatDate(task.doneDate)}
                        </span>
                      )}
                    </div>
                    {task.memo && (
                      <div className="text-xs text-gray-500 mt-1">
                        {task.memo}
                      </div>
                    )}
                  </div>
                  {task.doneDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="ml-2 text-gray-400 hover:text-blue-500 bg-transparent border-none p-0 m-0"
                      onClick={(e) => handleArchiveTask(e, task)}
                      disabled={archiveTaskPending}
                      aria-label="タスクアーカイブ"
                    >
                      <ArchiveIcon className="w-6 h-6" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="ml-2 text-gray-400 hover:text-red-500 bg-transparent border-none p-0 m-0"
                    onClick={(e) => handleDeleteTask(e, task)}
                    disabled={deleteTaskPending}
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
      </div>

      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          // 必要に応じてリフレッシュ処理を追加
        }}
      />

      <TaskEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={selectedTask}
        onSuccess={handleEditDialogClose}
      />
    </>
  );
};
