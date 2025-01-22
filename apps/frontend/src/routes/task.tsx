import { useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { GetTasksResponseSchema } from "@dtos/response/GetTasksResponse";


import { useToast, Button } from "@components/ui";

import { TaskForm, TaskCard } from "@components/task";

import { qp } from "../utils/queryParams";

const TaskPage: React.FC = () => {
  const [isFilteringCompletedTask, setIsFilteringCompletedTask] =
    useState(false);
  const { toast } = useToast();
  const { data, error } = useQuery({
    ...qp({
      queryKey: ["tasks"],
      queryFn: () => apiClient.users.tasks.$get(),
      schema: GetTasksResponseSchema,
    }),
  });

  if (error) {
    toast({
      title: "Error",
      description: error.message,
    });
  }

  const taskList =
    data?.filter((task) => {
      if (isFilteringCompletedTask && task.done) return false;
      return true;
    }) ?? [];

  return (
    <>
      <div className="my-5">
        <span className="mr-1">Hide Completed Tasks :</span>
        <Button
          onClick={() => setIsFilteringCompletedTask(!isFilteringCompletedTask)}
          variant={isFilteringCompletedTask ? "secondary" : "outline"}
        >
          {isFilteringCompletedTask ? "ON" : "OFF"}
        </Button>
      </div>
      <div className="flex gap-5 flex-wrap">
        <TaskForm className="w-80" />
        {taskList.map((task) => (
          <TaskCard key={task.id} task={task} className="w-80" />
        ))}
      </div>
      <Outlet />
    </>
  );
};

export const Route = createFileRoute("/task")({
  component: TaskPage,
});
