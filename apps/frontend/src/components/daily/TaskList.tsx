import type React from "react";
import { useState } from "react";

import { apiClient } from "@frontend/utils";
import { mp } from "@frontend/utils/mutationParams";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircledIcon,
  CircleIcon,
  CrossCircledIcon,
  PlusCircledIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const dateStr = dayjs(date).format("YYYY-MM-DD");

  const { mutate: mutateTaskDone } = useMutation({
    ...mp({
      queryKey: ["tasks", dateStr],
      mutationFn: ({ id, done }: { id: string; done: boolean }) =>
        apiClient.users.tasks[":id"].$put({
          param: { id },
          json: { doneDate: done ? dateStr : null },
        }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // タスク削除
  const { mutate: mutateDeleteTask, isPending: isDeletingTask } = useMutation({
    ...mp({
      queryKey: ["tasks", dateStr],
      mutationFn: (id: string) =>
        apiClient.users.tasks[":id"].$delete({ param: { id } }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // タスク追加
  const form = useForm<CreateTaskRequest>({
    resolver: zodResolver(createTaskRequestSchema),
    defaultValues: { title: "", startDate: dateStr },
  });
  const { mutate: mutateAddTask, isPending: isAddingTask } = useMutation({
    ...mp({
      queryKey: ["tasks", dateStr],
      mutationFn: (data: CreateTaskRequest) =>
        apiClient.users.tasks.$post({ json: data }),
      requestSchema: createTaskRequestSchema,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setAddFormOpen(false);
      form.reset();
    },
  });
  const handleAddTask = form.handleSubmit((data) =>
    mutateAddTask({ ...data, startDate: dateStr }),
  );

  return (
    <>
      <div className="flex-1 flex flex-col gap-4 px-4">
        <div className="flex flex-col-reverse gap-4">
          {tasks && tasks.length > 0 ? (
            tasks.map((task: GetTaskResponse) => (
              <Card key={task.id} className="cursor-default">
                <CardContent className="flex items-center gap-4 py-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex items-center justify-center w-10 h-10 text-3xl bg-transparent border-none p-0 m-0"
                    onClick={() =>
                      mutateTaskDone({ id: task.id, done: !task.doneDate })
                    }
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
                    onClick={(e) => {
                      e.stopPropagation();
                      mutateDeleteTask(task.id);
                    }}
                    disabled={isDeletingTask}
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
          <Card className="cursor-default">
            <CardContent className="flex items-center gap-4 py-4">
              <form
                onSubmit={handleAddTask}
                className="flex items-center gap-4 w-full"
              >
                <Input
                  {...form.register("title")}
                  placeholder="新しいタスクのタイトル"
                  disabled={isAddingTask}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={isAddingTask}>
                  追加
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddFormOpen(false)}
                  className="p-1"
                >
                  <CrossCircledIcon className="text-gray-400 w-8 h-8" />
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="cursor-pointer hover:bg-gray-100"
            onClick={() => setAddFormOpen(true)}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <span className="flex items-center justify-center w-10 h-10 text-3xl">
                <PlusCircledIcon className="text-gray-400 w-8 h-8" />
              </span>
              <div className="text-lg text-gray-500">新しいタスクを追加</div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};
