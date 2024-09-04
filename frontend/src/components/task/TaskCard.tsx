import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiRouteBase, useApiClient } from "../../hooks/useApiClient";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { Input } from "../ui/input";
import { useForm } from "react-hook-form";
import {
  UpdateTaskRequest,
  updateTaskRequestSchema,
} from "@/types/request/UpdateTaskRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormMessage } from "../ui/form";

type Tasks = ApiRouteBase["/users/tasks"]["$get"];

export const TaskCard: React.FC<{ task: Tasks[0] }> = ({ task }) => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isTitleEdit, setIsTitleEdit] = useState(false);

  const form = useForm<UpdateTaskRequest>({
    resolver: zodResolver(updateTaskRequestSchema),
    defaultValues: {
      title: task.title,
      done: task.done,
    },
  });

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

  const onSubmit = async (data: UpdateTaskRequest) => {
    if (data.title === task.title) {
      setIsTitleEdit(false);
      return;
    }
    const res = await api.users.tasks[":id"].$put({
      param: { id: task.id },
      json: data,
    });
    if (res.status === 200) {
      await res.json();
      toast({
        title: "Task Updated",
        description: "Task has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsTitleEdit(false);
    } else {
      const json = await res.json();
      console.log(json.message);
    }
  };

  return (
    <Card className={`w-80 ${task.done ? "bg-gray-300" : ""}`}>
      <CardHeader className="h-24">
        {isTitleEdit ? (
          <div className="flex gap-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <CardTitle>
                      <Input type="text" placeholder="Task Title" {...field} />
                      <FormMessage className="absolute" />
                    </CardTitle>
                  )}
                />
              </form>
              <Pencil2Icon
                className={`ml-auto cursor-pointer ${isTitleEdit ? "text-blue-500 hover:text-red-500" : "hover:text-blue-500"}`}
                onClick={() => setIsTitleEdit(false)}
              />
            </Form>
          </div>
        ) : (
          <CardTitle>
            <div className="flex">
              <h2 className="flex-1 line-clamp-2">{task.title}</h2>
              <Pencil2Icon
                className="ml-auto cursor-pointer hover:text-blue-500"
                onClick={() => setIsTitleEdit(true)}
              />
            </div>
          </CardTitle>
        )}
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
