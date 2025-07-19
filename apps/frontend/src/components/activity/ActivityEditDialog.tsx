import { useEffect } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";

import {
  type UpdateActivityRequest,
  UpdateActivityRequestSchema,
} from "@dtos/request/UpdateActivityRequest";
import type { GetActivityResponse } from "@dtos/response";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmojiPicker,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
} from "@components/ui";

export const ActivityEditDialog = ({
  open,
  onClose,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  activity: GetActivityResponse | null;
}) => {
  const api = apiClient;
  const queryClient = useQueryClient();
  const form = useForm<UpdateActivityRequest>({
    resolver: zodResolver(UpdateActivityRequestSchema),
    defaultValues: activity
      ? {
          activity: {
            name: activity.name,
            description: activity.description ?? "",
            quantityUnit: activity.quantityUnit,
            emoji: activity.emoji ?? "",
            showCombinedStats: activity.showCombinedStats ?? false,
          },
          kinds: activity.kinds.map((kind) => ({
            id: kind.id,
            name: kind.name,
          })),
        }
      : undefined,
  });

  useEffect(() => {
    if (activity) {
      form.reset({
        activity: {
          name: activity.name,
          description: activity.description ?? "",
          quantityUnit: activity.quantityUnit,
          emoji: activity.emoji ?? "",
          showCombinedStats: activity.showCombinedStats ?? false,
        },
        kinds: activity.kinds.map((kind) => ({
          id: kind.id,
          name: kind.name,
        })),
      });
    }
  }, [activity]);

  const {
    fields: kindFields,
    append: kindAppend,
    remove: kindRemove,
  } = useFieldArray({
    control: form.control,
    name: "kinds",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: UpdateActivityRequest) => {
      if (!activity) return;
      return api.users.activities[":id"].$put({
        param: { id: activity.id },
        json: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      onClose();
    },
  });

  const handleDelete = async () => {
    if (!activity) return;
    const res = await api.users.activities[":id"].$delete({
      param: { id: activity.id },
    });
    if (res.status !== 200) {
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["activity"] });
    onClose();
  };

  const onSubmit = (data: UpdateActivityRequest) => {
    mutate(data);
  };

  // 種類を削除するハンドラ
  const handleRemoveKind = (index: number) => {
    kindRemove(index);
  };

  // 種類を追加するハンドラ
  const handleAddKind = () => {
    kindAppend({ name: "" });
  };

  if (!open || !activity) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アクティビティ編集</DialogTitle>
          <DialogDescription>
            アクティビティの詳細設定を編集します
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="activity.name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} placeholder="名前" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activity.quantityUnit"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="単位（例: 回, 分, km など）"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activity.emoji"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <EmojiPicker
                      value={field.value || ""}
                      onChange={field.onChange}
                    >
                      <Input
                        value={field.value || ""}
                        placeholder="絵文字を選択"
                        className="w-32 text-center cursor-pointer"
                        readOnly
                      />
                    </EmojiPicker>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activity.showCombinedStats"
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
                    onClick={() => handleRemoveKind(index)}
                  >
                    -
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddKind}>
                + 種類を追加
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="ml-auto w-20"
              >
                削除
              </Button>
              <div className="flex gap-4 my-6 w-full">
                <Button className="w-full" type="submit" disabled={isPending}>
                  保存
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="w-24">
                    閉じる
                  </Button>
                </DialogClose>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
