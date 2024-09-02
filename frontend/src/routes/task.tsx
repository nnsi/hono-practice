import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/frontend/src/hooks/useApiClient";
import { TaskForm } from "../components/task/TaskForm";
import { TaskCard } from "../components/task/TaskCard";

const TaskPage: React.FC = () => {
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

  return (
    <div className="flex gap-5 flex-wrap">
      <TaskForm />
      {query.data?.map((task) => {
        return <TaskCard key={task.id} task={task} />;
      })}
    </div>
  );
};

export const Route = createFileRoute("/task")({
  component: TaskPage,
});
