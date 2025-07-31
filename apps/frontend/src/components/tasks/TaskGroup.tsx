import type React from "react";

import { TaskEditDialog } from "@frontend/components/tasks/TaskEditDialog";
import { useTaskGroup } from "@frontend/hooks/feature/tasks/useTaskGroup";
import {
  ArchiveIcon,
  CalendarIcon,
  CheckCircledIcon,
  CircleIcon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";
import dayjs from "dayjs";

import { Button, Card, CardContent } from "@components/ui";

type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

interface TaskGroupProps {
  title: string;
  tasks: TaskItem[];
  isLoading: boolean;
  titleColor?: string;
  highlight?: boolean;
  completed?: boolean;
  archived?: boolean;
  emptyMessage?: string;
  onCreateClick?: () => void;
}

export const TaskGroup: React.FC<TaskGroupProps> = ({
  title,
  tasks,
  isLoading,
  titleColor = "text-gray-700",
  highlight = false,
  completed = false,
  archived = false,
  emptyMessage,
  onCreateClick,
}) => {
  const {
    editDialogOpen,
    selectedTask,
    setEditDialogOpen,
    handleToggleTaskDone,
    handleMoveToToday,
    handleArchiveTask,
    handleTaskClick,
    handleDialogSuccess,
  } = useTaskGroup();

  if (isLoading && tasks.length === 0) {
    return (
      <div>
        <h2 className={`text-lg font-semibold mb-2 ${titleColor}`}>{title}</h2>
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (tasks.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <div>
      <h2 className={`text-lg font-semibold ${titleColor} mb-2`}>
        {title} <span className="text-sm text-gray-500">({tasks.length})</span>
      </h2>

      <div className="space-y-2">
        {title === "今日" && (
          <Card
            className="cursor-pointer shadow-sm rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md hover:border-gray-400 transition-all duration-200 group h-20"
            onClick={() => onCreateClick?.()}
          >
            <CardContent className="flex items-center justify-center gap-2 p-0 h-full">
              <PlusCircledIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              <span className="text-sm text-gray-500 group-hover:text-gray-700">
                新規タスクを追加
              </span>
            </CardContent>
          </Card>
        )}
        {tasks.map((task) => (
          <Card
            key={task.id}
            className={`
              cursor-pointer transition-all duration-200 h-20
              ${highlight ? "border-red-200 bg-red-50" : ""}
              ${!completed ? "hover:shadow-md" : ""}
            `}
            onClick={() => handleTaskClick(task)}
          >
            <div className="flex items-center gap-3 p-3 h-full">
              {/* チェックボックス */}
              {!archived && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTaskDone(task);
                  }}
                  className="p-0 h-auto"
                >
                  {task.doneDate ? (
                    <CheckCircledIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <CircleIcon className="w-5 h-5 text-gray-400" />
                  )}
                </Button>
              )}

              {/* タスクタイトル */}
              <div className="flex-1 min-w-0">
                <div
                  className={`${completed ? "line-through text-gray-500" : ""}`}
                >
                  {task.title}
                </div>
                {(task.startDate || task.dueDate) && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {task.startDate &&
                      `開始: ${dayjs(task.startDate).format("MM/DD")}`}
                    {task.startDate && task.dueDate && " / "}
                    {task.dueDate &&
                      `期限: ${dayjs(task.dueDate).format("MM/DD")}`}
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              <div className="flex items-center gap-1">
                {/* 完了済みタスクのアーカイブボタン */}
                {task.doneDate && !archived && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveTask(task);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    title="アーカイブ"
                  >
                    <ArchiveIcon className="w-4 h-4" />
                  </Button>
                )}
                {/* 未完了タスクの今日やるボタン */}
                {!completed && !task.doneDate && title !== "今日" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToToday(task);
                    }}
                    className="text-blue-500 hover:text-blue-700"
                    title="今日やる"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <TaskEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={selectedTask}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
};
