import { useNewGoalDialog } from "@frontend/hooks/feature/goal/useNewGoalDialog";

import type { GetActivityResponse } from "@dtos/response";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui";

import { ActivityIcon } from "../common/ActivityIcon";

type NewGoalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: GetActivityResponse[];
  onSuccess?: () => void;
};

export const NewGoalDialog: React.FC<NewGoalDialogProps> = ({
  open,
  onOpenChange,
  activities,
  onSuccess,
}) => {
  const { form, createGoal, selectedActivity, quantityUnit, handleSubmit } =
    useNewGoalDialog(onOpenChange, activities, onSuccess);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新しい目標を作成</DialogTitle>
          <DialogDescription>
            アクティビティと日次目標を設定してください
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="activityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>アクティビティ</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="活動を選択">
                          {selectedActivity && (
                            <div className="flex items-center gap-2">
                              <ActivityIcon
                                activity={selectedActivity}
                                size="small"
                              />
                              <span>{selectedActivity.name}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          <div className="flex items-center gap-2">
                            <ActivityIcon activity={activity} size="small" />
                            <span>{activity.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dailyTargetQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    日次目標
                    {quantityUnit && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({quantityUnit})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>開始日</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>終了日（任意）</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={createGoal.isPending}>
                作成
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
