import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import { apiClient } from "@/frontend/src/utils/apiClient";
import { GetTasksResponseSchema } from "@/types/response/GetTasksResponse";

import { useToast, Button } from "@components/ui";

import { TaskForm, TaskCard } from "@components/task";

import { queryFnFunc } from "../utils/queryFnFunc";

const TaskPage: React.FC = () => {
  const [isFilteringCompletedTask, setIsFilteringCompletedTask] =
    useState(false);
  const { toast } = useToast();
  const { data, error } = useQuery({
    ...queryFnFunc(
      ["tasks"],
      () => apiClient.users.tasks.$get(),
      GetTasksResponseSchema
    ),
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
      <TransitionGroup className="flex gap-5 flex-wrap">
        <TaskForm className="w-80" />
        {taskList.map((task) => (
          <CSSTransition
            key={task.id}
            timeout={200}
            classNames={{
              enter: "w-0 opacity-0",
              enterActive: "w-80 opacity-100",
              exit: "w-80 opacity-100",
              exitActive: "w-[1px] opacity-0",
            }}
          >
            <div className="transition-all duration-200 ease-in-out overflow-hidden">
              <TaskCard key={task.id} task={task} className="w-80" />
            </div>
          </CSSTransition>
        ))}
      </TransitionGroup>
      <Outlet />
    </>
  );
};

export const Route = createFileRoute("/task")({
  component: TaskPage,
});
