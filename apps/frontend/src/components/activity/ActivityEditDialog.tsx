import { useActivityEdit } from "@frontend/hooks/feature/activity/useActivityEdit";

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
  const {
    form,
    kindFields,
    isPending,
    onSubmit,
    handleDelete,
    handleRemoveKind,
    handleAddKind,
  } = useActivityEdit(activity, onClose);

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
