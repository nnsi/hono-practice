import { mp } from "@frontend/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import {
  type CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@dtos/request/CreateActivityRequest";
import { GetActivityResponseSchema } from "@dtos/response/GetActivitiesResponse";

import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  Form,
  FormField,
  Input,
  Button,
  useToast,
} from "@components/ui";

export function NewActivityDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<CreateActivityRequest>({
    resolver: zodResolver(CreateActivityRequestSchema),
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate, isPending } = useMutation({
    ...mp({
      queryKey: [],
      mutationFn: (data: CreateActivityRequest) =>
        apiClient.users.activities.$post({
          json: data,
        }),
      requestSchema: CreateActivityRequestSchema,
      responseSchema: GetActivityResponseSchema,
    }),
    onSuccess: () => {
      toast({
        title: "登録完了",
        description: "アクティビティを作成しました",
        variant: "default",
      });
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "アクティビティの作成に失敗しました",
        variant: "destructive",
      });
    },
  });
  const onSubmit = (data: CreateActivityRequest) => {
    mutate(data);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Activity</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-4 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <Input
                    type="text"
                    className="col-span-4"
                    placeholder="Activity Name"
                    {...field}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="quantityUnit"
                render={({ field }) => (
                  <Input
                    type="text"
                    className="col-span-2"
                    placeholder="unit"
                    {...field}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="emoji"
                render={({ field }) => (
                  <Input
                    className="col-span-1"
                    type="text"
                    placeholder="emoji"
                    {...field}
                  />
                )}
              />
              <Button type="submit" disabled={isPending}>
                Create
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
