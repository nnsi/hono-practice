import { useQueryClient } from "@tanstack/react-query";
import { ApiRouteBase, useApiClient } from "../../hooks/useApiClient";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";

type Tasks = ApiRouteBase["/users/tasks"]["$get"];

export const TaskCard: React.FC<{ task: Tasks[0] }> = ({ task }) => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDone = async () => {
    const res = await api.users.tasks[":id"].$put({
      param: { id: task.id },
      json: { done: !task.done },
    });
    if (res.status === 200) {
      await res.json();
      toast({
        title: "Task Updated",
        description: "Task has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } else {
      const json = await res.json();
      console.log(json.message);
    }
  };

  const handleDelete = async () => {
    const res = await api.users.tasks[":id"].$delete({
      param: { id: task.id },
    });
    if (res.status === 200) {
      await res.json();
      toast({
        title: "Task Deleted",
        description: "Task has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } else {
      const json = await res.json();
      console.log(json.message);
    }
  };

  return (
    <Card className={`w-80 ${task.done ? "bg-gray-300" : ""}`}>
      <CardHeader>
        <CardTitle>{task.title}</CardTitle>
      </CardHeader>
      <CardFooter className="flex">
        <Button onClick={handleDone}>{task.done ? "Undone" : "Done"}</Button>
        <Button
          onClick={handleDelete}
          variant="destructive"
          className="ml-auto"
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};
