import type React from "react";
import { useState } from "react";

import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from "@frontend/hooks/sync/useSyncedTask";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircledIcon,
  CircleIcon,
  CrossCircledIcon,
  PlusCircledIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import {
  type CreateTaskRequest,
  createTaskRequestSchema,
} from "@dtos/request/CreateTaskRequest";
import type { GetTaskResponse } from "@dtos/response/GetTasksResponse";

import { Button, Card, CardContent, Input } from "@components/ui";

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
  const [addFormOpen, setAddFormOpen] = useState(false);
  const dateStr = dayjs(date).format("YYYY-MM-DD");

  // 同期対応のフックを使用
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();

  // タスク追加
  const form = useForm<CreateTaskRequest>({
    resolver: zodResolver(createTaskRequestSchema),
    defaultValues: { title: "", startDate: dateStr },
  });
  const handleAddTask = form.handleSubmit(async (data) => {
    await createTask.mutateAsync({
      title: data.title,
      startDate: dateStr,
    });
    setAddFormOpen(false);
    form.reset();
  });

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

  // タスク追加フォームを閉じるハンドラ
  const handleCloseAddForm = () => {
    setAddFormOpen(false);
  };

  // タスク追加フォームを開くハンドラ
  const handleOpenAddForm = () => {
    setAddFormOpen(true);
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
        {addFormOpen ? (
          <Card className="cursor-default shadow-sm h-20">
            <CardContent className="flex items-center gap-4 p-0 px-4 h-full">
              <form
                onSubmit={handleAddTask}
                className="flex items-center gap-4 w-full"
              >
                <Input
                  {...form.register("title")}
                  placeholder="新しいタスクのタイトル"
                  disabled={createTask.isPending}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={createTask.isPending}>
                  追加
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseAddForm}
                  className="p-1"
                >
                  <CrossCircledIcon className="text-gray-400 w-8 h-8" />
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="cursor-pointer shadow-sm rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md hover:border-gray-400 transition-all duration-200 group h-20"
            onClick={handleOpenAddForm}
          >
            <CardContent className="flex items-center gap-4 p-0 px-4 h-full">
              <span className="flex items-center justify-center w-10 h-10 text-3xl">
                <PlusCircledIcon className="text-gray-400 w-8 h-8 group-hover:text-gray-600" />
              </span>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-500 group-hover:text-gray-700">
                  新しいタスクを追加
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};
