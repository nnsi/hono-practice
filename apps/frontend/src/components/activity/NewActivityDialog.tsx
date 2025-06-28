import { apiClient } from "@frontend/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";

import {
  type CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@dtos/request/CreateActivityRequest";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  Input,
  useToast,
} from "@components/ui";

export function NewActivityDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<CreateActivityRequest & { kinds: { name: string }[] }>({
    resolver: zodResolver(CreateActivityRequestSchema),
    defaultValues: {
      name: "",
      quantityUnit: "",
      emoji: "",
      showCombinedStats: false,
      kinds: [],
    },
  });
  const {
    fields: kindFields,
    append: kindAppend,
    remove: kindRemove,
  } = useFieldArray({
    control: form.control,
    name: "kinds",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate, isPending } = useMutation({
    mutationFn: async (
      data: CreateActivityRequest & { kinds: { name: string }[] },
    ) => {
      return apiClient.users.activities.$post({
        json: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "登録完了",
        description: "アクティビティを作成しました",
        variant: "default",
      });
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "アクティビティの作成に失敗しました",
        variant: "destructive",
      });
    },
  });
  const onSubmit = (
    data: CreateActivityRequest & { kinds: { name: string }[] },
  ) => {
    mutate(data);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アクティビティ新規作成</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => <Input {...field} placeholder="名前" />}
            />
            <FormField
              control={form.control}
              name="quantityUnit"
              render={({ field }) => (
                <Input {...field} placeholder="単位（例: 回, 分, km など）" />
              )}
            />
            <FormField
              control={form.control}
              name="emoji"
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="絵文字"
                  className="w-20 text-center"
                />
              )}
            />
            <FormField
              control={form.control}
              name="showCombinedStats"
              render={({ field }) => (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                  合算統計を表示
                </label>
              )}
            />
            <div>
              <div className="mb-2 font-semibold">種類（kinds）</div>
              {kindFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2 items-center">
                  <FormField
                    control={form.control}
                    name={`kinds.${index}.name`}
                    render={({ field }) => (
                      <Input {...field} placeholder="種類名" />
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => kindRemove(index)}
                  >
                    -
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => kindAppend({ name: "" })}
              >
                + 種類を追加
              </Button>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  閉じる
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                登録
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
