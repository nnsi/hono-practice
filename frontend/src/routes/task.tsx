import { useState } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/frontend/src/hooks/useApiClient";
import { TaskForm } from "../components/task/TaskForm";
import { TaskCard } from "../components/task/TaskCard";
import { Button } from "@ui/button";
import { GetTasksResponseSchema } from "@/types/response/GetTasksResponse";
import { useToast } from "@ui/use-toast";

const TaskPage: React.FC = () => {
  const [isFilteringCompletedTask, setIsFilteringCompletedTask] =
    useState(false);
  const api = useApiClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.users.tasks.$get();
      if (res.status === 200) {
        const json = await res.json();
        const parsedJson = GetTasksResponseSchema.safeParse(json);
        if (!parsedJson.success) {
          toast({
            title: "Error",
            description: "Failed to fetch tasks",
            variant: "destructive",
          });
          return;
        }
        return parsedJson.data;
      } else {
        const json = await res.json();
        toast({
          title: "Error",
          description: json.message,
          variant: "destructive",
        });
        return;
      }
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
            timeout={190}
            classNames={{
              enter: "w-0 opacity-0",
              enterActive: "w-80 opacity-100",
              exit: "w-80 opacity-100",
              exitActive: "w-2 opacity-0",
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
