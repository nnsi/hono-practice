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
} from "@components/ui";
import type { UpdateActivityRequest } from "@dtos/request/UpdateActivityRequest";
import type {
  ActivityEditActions,
  ActivityEditIconProps,
} from "@packages/frontend-shared/hooks/feature/useActivityEdit";
import type { UseFormReturn } from "react-hook-form";

import { IconTypeSelector } from "./IconTypeSelector";

export type ActivityEditDialogViewProps = {
  open: boolean;
  form: UseFormReturn<UpdateActivityRequest>;
  kindFields: { id?: string; name: string; color?: string }[];
  isPending: boolean;
  iconProps: ActivityEditIconProps;
  actions: ActivityEditActions;
  onClose: () => void;
};

export function ActivityEditDialogView({
  open,
  form,
  kindFields,
  isPending,
  iconProps,
  actions,
  onClose,
}: ActivityEditDialogViewProps) {
  if (!open) return null;

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
          <form onSubmit={actions.onSubmit} className="space-y-4">
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
            <FormItem>
              <IconTypeSelector
                value={iconProps.value}
                onChange={iconProps.onChange}
                disabled={isPending}
              />
              <FormMessage />
            </FormItem>
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
                <div
                  key={field.id ?? index}
                  className="flex gap-2 mb-2 items-center"
                >
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
                    onClick={() => actions.onRemoveKind(index)}
                  >
                    -
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={actions.onAddKind}
              >
                + 種類を追加
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                onClick={actions.onDelete}
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
}
