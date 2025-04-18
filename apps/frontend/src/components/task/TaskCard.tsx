import { useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import {
  type UpdateTaskRequest,
  updateTaskRequestSchema,
} from "@dtos/request/UpdateTaskRequest";
import type { GetTaskResponse } from "@dtos/response";

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

import { mp } from "../../utils";



type TaskCardProps = {
  task: GetTaskResponse;
  className?: string;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, className }) => {
  const { toast } = useToast();
  const [isTitleEdit, setIsTitleEdit] = useState(false);

  const form = useForm<UpdateTaskRequest>({
    resolver: zodResolver(updateTaskRequestSchema),
    defaultValues: {
      title: task.title,
      done: task.done,
    },
  });

  const { mutate, isError } = useMutation({
    ...mp({
      queryKey: ["tasks"],
      mutationFn: (data: UpdateTaskRequest) =>
        apiClient.users.tasks[":id"].$put({
          param: { id: task.id },
          json: data,
        }),
      requestSchema: updateTaskRequestSchema,
    }),
  });

  const { mutate: mutateDelete, isError: isErrorDelete } = useMutation({
    ...mp({
      queryKey: ["tasks"],
      mutationFn: () =>
        apiClient.users.tasks[":id"].$delete({ param: { id: task.id } }),
    }),
  });

  if (isError) {
    toast({
      title: "Error",
      description: "Failed to update task",
      variant: "destructive",
    });
  }

  if (isErrorDelete) {
    toast({
      title: "Error",
      description: "Failed to delete task",
      variant: "destructive",
    });
  }

  const handleDone = async () => {
    mutate({ done: !task.done });
  };

  const handleDelete = async () => {
    mutateDelete();
  };

  const onSubmit = async (data: UpdateTaskRequest) => {
    mutate(data);
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
