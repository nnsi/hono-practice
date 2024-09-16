import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import {
  UpdateTaskRequest,
  updateTaskRequestSchema,
} from "@/types/request/UpdateTaskRequest";
import { GetTasksResponse } from "@/types/response/GetTasksResponse";

import { useApiClient } from "@hooks/useApiClient";

import {
  Button,
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  FormField,
  FormMessage,
  Input,
  useToast,
} from "@components/ui";

type TaskCardProps = {
  task: GetTasksResponse[0];
  className?: string;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, className }) => {
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
      const json = await res.json();
      toast({
        title: "Task Updated",
        description: "Task has been updated successfully",
      });
      queryClient.setQueryData(["tasks"], (data: GetTasksResponse) => {
        return data.map((t) => {
          if (t.id === task.id) {
            return { ...t, done: json.done };
          }
          return t;
        });
      });
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
    <Card className={`${task.done ? "bg-gray-300" : ""} ${className}`}>
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
              <Link to="/task/$id" params={{ id: task.id.toString() }}>
                <h2 className="flex-1 line-clamp-2">{task.title}</h2>
              </Link>
              <Pencil2Icon
                className="ml-auto cursor-pointer hover:text-blue-500 w-9"
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
