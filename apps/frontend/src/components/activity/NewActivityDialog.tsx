import { useState } from "react";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  useToast,
} from "@components/ui";
import {
  type CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@dtos/request/CreateActivityRequest";
import { useCreateActivity } from "@frontend/hooks/api";
import { resizeImage } from "@frontend/utils/imageResizer";
import { tokenStore } from "@frontend/utils/tokenStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import { IconTypeSelector } from "./IconTypeSelector";

export function NewActivityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [iconFile, setIconFile] = useState<File | undefined>();
  const [iconPreview, setIconPreview] = useState<string | undefined>();

  const form = useForm<
    CreateActivityRequest & { kinds: { name: string; color?: string }[] }
  >({
    resolver: zodResolver(CreateActivityRequestSchema),
    defaultValues: {
      name: "",
      quantityUnit: "",
      emoji: "🎯",
      iconType: "emoji",
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
  const { toast } = useToast();
  const { mutateAsync, isPending } = useCreateActivity();
  const onSubmit = async (
    data: CreateActivityRequest & { kinds: { name: string; color?: string }[] },
  ) => {
    try {
      const activity = await mutateAsync(data);

      // Upload icon if file is selected and activity was created successfully
      if (data.iconType === "upload" && iconFile && activity?.id) {
        try {
          // Resize image to 256x256 max and convert to base64
          const { base64, mimeType } = await resizeImage(iconFile, 256, 256);

          const API_URL =
            import.meta.env.MODE === "development"
              ? import.meta.env.VITE_API_URL ||
                `http://${window.location.hostname}:${import.meta.env.VITE_API_PORT || "3456"}/`
              : import.meta.env.VITE_API_URL;

          const token = tokenStore.getToken();
          const headers: HeadersInit = {
            "Content-Type": "application/json",
          };
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          const uploadResponse = await fetch(
            `${API_URL}users/activities/${activity.id}/icon`,
            {
              method: "POST",
              body: JSON.stringify({ base64, mimeType }),
              headers,
            },
          );

          if (!uploadResponse.ok) {
            console.error("Failed to upload icon");
          }
        } catch (error) {
          console.error("Failed to upload icon:", error);
        }
      }

      // Close dialog and reset form
      onOpenChange(false);
      form.reset();
      setIconFile(undefined);
      setIconPreview(undefined);

      // Show toast notification
      toast({
        title: "登録完了",
        description: "アクティビティを作成しました",
        variant: "default",
      });
    } catch (_error) {
      toast({
        title: "エラー",
        description: "アクティビティの作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  // 種類を削除するハンドラ
  const handleRemoveKind = (index: number) => {
    kindRemove(index);
  };

  // 種類を追加するハンドラ
  const handleAddKind = () => {
    kindAppend({ name: "", color: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アクティビティ新規作成</DialogTitle>
          <DialogDescription>
            新しいアクティビティを作成します
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
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
              name="quantityUnit"
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
            <FormItem>
              <IconTypeSelector
                value={{
                  type: form.watch("iconType") || "emoji",
                  emoji: form.watch("emoji"),
                  file: iconFile,
                  preview: iconPreview,
                }}
                onChange={(value) => {
                  form.setValue("iconType", value.type);
                  if (value.type === "emoji") {
                    form.setValue("emoji", value.emoji || "");
                    setIconFile(undefined);
                    setIconPreview(undefined);
                  } else if (value.type === "upload") {
                    form.setValue("emoji", "📷"); // Default emoji for uploaded icons
                    setIconFile(value.file);
                    setIconPreview(value.preview);
                  }
                }}
                disabled={isPending}
              />
              <FormMessage />
            </FormItem>
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
                      <Input
                        {...field}
                        placeholder="種類名"
                        className="flex-1"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`kinds.${index}.color`}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Input
                          {...field}
                          type="color"
                          className="w-14 h-10 p-1 cursor-pointer"
                          title="色を選択"
                        />
                        <Input
                          {...field}
                          type="text"
                          placeholder="#000000"
                          className="w-24"
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
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
