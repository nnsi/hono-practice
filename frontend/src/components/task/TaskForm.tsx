import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { apiClient } from "@/frontend/src/utils/apiClient";
import {
  type CreateTaskRequest,
  createTaskRequestSchema,
} from "@/types/request/CreateTaskRequest";

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

type TaskFormProps = {
  className?: string;
};

export const TaskForm: React.FC<TaskFormProps> = ({ className }) => {
  const api = apiClient;
  const { toast } = useToast();

  const form = useForm<CreateTaskRequest>({
    resolver: zodResolver(createTaskRequestSchema),
  });

  const { mutate, isError } = useMutation({
    ...mp({
      queryKey: ["tasks"],
      mutationFn: (data: CreateTaskRequest) =>
        api.users.tasks.$post({ json: data }),
      requestSchema: createTaskRequestSchema,
    }),
  });

  if (isError) {
    toast({
      title: "Error",
      description: "Failed to create task",
      variant: "destructive",
    });
  }

  const onSubmit = async (data: CreateTaskRequest) => {
    mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className={className}>
          <CardHeader className="h-24">
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
          </CardHeader>
          <CardFooter>
            <Button type="submit">Create</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};
