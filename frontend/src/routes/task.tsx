import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ApiRouteBase, useApiClient } from "@/frontend/src/hooks/useApiClient";
import { Card, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

type Tasks = ApiRouteBase["/users/tasks"]["$get"];

const TaskCard: React.FC<{ task: Tasks[0] }> = ({ task }) => {
  return (
    <Card className={`w-80 ${task.done ? "bg-gray-300" : ""}`}>
      <CardHeader>
        <CardTitle>{task.title}</CardTitle>
      </CardHeader>
      <CardFooter>
        <Button>{task.done ? "Undone" : "Done"}</Button>
      </CardFooter>
    </Card>
  );
};

const TaskPage: React.FC = () => {
  const api = useApiClient();
  const query = useQuery({
    queryKey: ["task"],
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
      {query.data?.map((task) => {
        return <TaskCard key={task.id} task={task} />;
      })}
    </div>
  );
};

export const Route = createFileRoute("/task")({
  component: TaskPage,
});
