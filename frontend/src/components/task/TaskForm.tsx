import {
  CreateTaskRequest,
  createTaskRequestSchema,
} from "@/types/request/CreateTaskRequest";
import { Button } from "../ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Form, FormField, FormMessage } from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { useApiClient } from "../../hooks/useApiClient";
import { useQueryClient } from "@tanstack/react-query";

export const TaskForm: React.FC = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const form = useForm<CreateTaskRequest>({
    resolver: zodResolver(createTaskRequestSchema),
  });

  const onSubmit = async (data: CreateTaskRequest) => {
    try {
      const res = await api.users.tasks.$post({ json: data });
      if (res.status === 200) {
        await res.json();
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      } else {
        const json = await res.json();
        console.log(json.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="w-80">
          <CardHeader>
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
