import { useState } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/frontend/src/hooks/useApiClient";
import { TaskForm } from "../components/task/TaskForm";
import { TaskCard } from "../components/task/TaskCard";
import { Button } from "../components/ui/button";

const TaskPage: React.FC = () => {
  const [isFilteringCompletedTask, setIsFilteringCompletedTask] =
    useState(false);
  const api = useApiClient();
  const query = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.users.tasks.$get();
      if (res.status === 200) {
        return await res.json();
      }

      const json = (await res.json()) as unknown as { message: string };
      console.log(json.message);
      return;
    },
  });

  const taskList =
    query.data?.filter((task) => {
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
            timeout={300}
            classNames={{
              enter: "opacity-0",
              enterActive: "opacity-100 transition-all duration-300 ease-in",
              exit: "opacity-100 overflow-hidden",
              exitActive: "w-0 opacity-0 transition-all duration-300 ease-in",
            }}
          >
            <TaskCard key={task.id} task={task} />
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
