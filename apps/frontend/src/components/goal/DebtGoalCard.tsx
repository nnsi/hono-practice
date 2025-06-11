import { useState } from "react";

import { apiClient } from "@frontend/utils";
import { cn } from "@frontend/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import { UpdateDebtGoalRequestSchema } from "@dtos/request";
import type { DebtGoalResponse } from "@dtos/response";

import { Card, CardContent, CardHeader, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@components/ui";

import type { z } from "zod";

type DebtGoalCardProps = {
  goal: DebtGoalResponse;
  activityName: string;
};

export const DebtGoalCard: React.FC<DebtGoalCardProps> = ({ goal, activityName }) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const isInDebt = goal.currentBalance < 0;
  const isSaving = goal.currentBalance > 0;
  const absBalance = Math.abs(goal.currentBalance);
  const daysCount = Math.ceil(absBalance / goal.dailyTargetQuantity);

  const form = useForm<z.infer<typeof UpdateDebtGoalRequestSchema>>({
    resolver: zodResolver(UpdateDebtGoalRequestSchema),
    defaultValues: {
      dailyTargetQuantity: goal.dailyTargetQuantity,
      startDate: goal.startDate,
      endDate: goal.endDate,
      description: goal.description || "",
      isActive: goal.isActive,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof UpdateDebtGoalRequestSchema>) => {
      const res = await apiClient.goals.debt[":id"].$put({
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
      const res = await apiClient.goals[":type"][":id"].$delete({
        param: { type: "debt", id: goal.id },
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setDeleteDialogOpen(false);
    },
  });

  const onSubmit = (data: z.infer<typeof UpdateDebtGoalRequestSchema>) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const getStatusColor = () => {
    if (isInDebt) return "text-red-600";
    if (isSaving) return "text-green-600";
    return "text-gray-600";
  };

  const getStatusText = () => {
    if (isInDebt) return `${daysCount}日分の負債`;
    if (isSaving) return `${daysCount}日分の貯金`;
    return "目標達成中";
  };

  const getStatusIcon = () => {
    if (isInDebt) return "📉";
    if (isSaving) return "📈";
    return "✅";
  };

  const formatDate = (date: string) => dayjs(date).format("YYYY/MM/DD");

  return (
    <Card className={cn("border", isInDebt && "border-red-200", isSaving && "border-green-200")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">
              {getStatusIcon()} {activityName}
            </h3>
            <p className="text-sm text-gray-600">
              日次目標: {goal.dailyTargetQuantity}
              {goal.description && (
                <span className="ml-2 text-gray-500">• {goal.description}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("font-semibold", getStatusColor())}>
              {getStatusText()}
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
                    <DialogTitle>負債目標を編集</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="dailyTargetQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>日次目標</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>開始日</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>終了日</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} />
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
                        <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                          キャンセル
                        </Button>
                        <Button type="submit" disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? "更新中..." : "更新"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
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
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">期間</p>
            <p>
              {formatDate(goal.startDate)} 〜 {goal.endDate ? formatDate(goal.endDate) : "無期限"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">累積実績 / 累積負債</p>
            <p>
              {goal.totalActual} / {goal.totalDebt}
            </p>
          </div>
        </div>
        {goal.totalDebt > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">進捗</span>
              <span>{Math.round((goal.totalActual / goal.totalDebt) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn("h-2 rounded-full", isInDebt ? "bg-red-500" : "bg-green-500")}
                style={{ width: `${Math.min(100, (goal.totalActual / goal.totalDebt) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};