import { useState } from "react";

import { apiClient } from "@frontend/utils";
import { cn } from "@frontend/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import { UpdateMonthlyGoalRequestSchema } from "@dtos/request";
import type { MonthlyTargetGoalResponse } from "@dtos/response";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@components/ui";

import type { z } from "zod";

type MonthlyGoalCardProps = {
  goal: MonthlyTargetGoalResponse;
  activityName: string;
};

export const MonthlyGoalCard: React.FC<MonthlyGoalCardProps> = ({
  goal,
  activityName,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const progressPercent = Math.round(goal.progressRate * 100);
  const remainingDays = dayjs(goal.targetMonth)
    .endOf("month")
    .diff(dayjs(), "day");
  const dailyPaceRequired =
    remainingDays > 0
      ? Math.ceil((goal.targetQuantity - goal.currentQuantity) / remainingDays)
      : 0;

  const form = useForm<z.infer<typeof UpdateMonthlyGoalRequestSchema>>({
    resolver: zodResolver(UpdateMonthlyGoalRequestSchema),
    defaultValues: {
      targetMonth: goal.targetMonth,
      targetQuantity: goal.targetQuantity,
      description: goal.description || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (
      data: z.infer<typeof UpdateMonthlyGoalRequestSchema>,
    ) => {
      const res = await apiClient.users.goals.monthly_target[":id"].$put({
        param: { id: goal.id },
        json: data,
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setEditDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.users.goals[":type"][":id"].$delete({
        param: { type: "monthly_target", id: goal.id },
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setDeleteDialogOpen(false);
    },
  });

  const onSubmit = (data: z.infer<typeof UpdateMonthlyGoalRequestSchema>) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const getProgressColor = () => {
    if (goal.isAchieved) return "text-green-600";
    if (progressPercent >= 80) return "text-blue-600";
    if (progressPercent >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressBarColor = () => {
    if (goal.isAchieved) return "bg-green-500";
    if (progressPercent >= 80) return "bg-blue-500";
    if (progressPercent >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusIcon = () => {
    if (goal.isAchieved) return "🏆";
    if (progressPercent >= 80) return "📊";
    if (progressPercent >= 50) return "⚡";
    return "⚠️";
  };

  const formatMonth = (month: string) => dayjs(month).format("YYYY年MM月");

  return (
    <Card className={cn("border", goal.isAchieved && "border-green-200")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">
              {getStatusIcon()} {activityName}
            </h3>
            <p className="text-sm text-gray-600">
              {formatMonth(goal.targetMonth)}の目標
              {goal.description && (
                <span className="ml-2 text-gray-500">• {goal.description}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("font-semibold text-2xl", getProgressColor())}>
              {progressPercent}%
            </div>
            <div className="flex gap-1">
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Pencil1Icon className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>月間目標を編集</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="targetMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>対象月</FormLabel>
                            <FormControl>
                              <Input type="month" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="targetQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>目標数</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>説明</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditDialogOpen(false)}
                        >
                          キャンセル
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? "更新中..." : "更新"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>目標を削除</DialogTitle>
                  </DialogHeader>
                  <p>この目標を削除しますか？この操作は取り消せません。</p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "削除中..." : "削除"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">進捗</span>
              <span>
                {goal.currentQuantity} / {goal.targetQuantity}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={cn(
                  "h-3 rounded-full transition-all",
                  getProgressBarColor(),
                )}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>

          {!goal.isAchieved && remainingDays > 0 && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">残り日数</p>
                <p className="font-medium">{remainingDays}日</p>
              </div>
              <div>
                <p className="text-gray-500">必要な日割りペース</p>
                <p className="font-medium">{dailyPaceRequired}/日</p>
              </div>
            </div>
          )}

          {goal.isAchieved && (
            <div className="text-center py-2">
              <p className="text-green-600 font-semibold">目標達成済み！</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
