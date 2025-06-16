import { useState } from "react";

import { useCreateDebtGoal, useCreateMonthlyGoal } from "@frontend/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import {
  CreateDebtGoalRequestSchema,
  CreateMonthlyGoalRequestSchema,
  type CreateDebtGoalRequest,
  type CreateMonthlyGoalRequest,
} from "@dtos/request";
import type { GetActivityResponse } from "@dtos/response";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
  DialogClose,
} from "@components/ui";

type GoalCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: GetActivityResponse[];
};

export const GoalCreateDialog: React.FC<GoalCreateDialogProps> = ({
  open,
  onOpenChange,
  activities,
}) => {
  const [goalType, setGoalType] = useState<"debt" | "monthly">("debt");
  const { toast } = useToast();

  const debtForm = useForm<CreateDebtGoalRequest>({
    resolver: zodResolver(CreateDebtGoalRequestSchema),
    defaultValues: {
      activityId: "",
      dailyTargetQuantity: undefined as any,
      startDate: dayjs().format("YYYY-MM-DD"),
      endDate: undefined,
      description: "",
    },
  });

  const monthlyForm = useForm<CreateMonthlyGoalRequest>({
    resolver: zodResolver(CreateMonthlyGoalRequestSchema),
    defaultValues: {
      activityId: "",
      targetQuantity: undefined as any,
      targetMonth: dayjs().format("YYYY-MM"),
      description: "",
    },
  });

  const createDebtGoal = useCreateDebtGoal();
  const createMonthlyGoal = useCreateMonthlyGoal();

  const handleDebtSubmit = (data: CreateDebtGoalRequest) => {
    createDebtGoal.mutate({
      ...data,
      dailyTargetQuantity: data.dailyTargetQuantity || 1,
    }, {
      onSuccess: () => {
        toast({
          title: "成功",
          description: "負債目標を作成しました",
        });
        debtForm.reset();
        onOpenChange(false);
      },
      onError: () => {
        toast({
          title: "エラー",
          description: "負債目標の作成に失敗しました",
          variant: "destructive",
        });
      },
    });
  };

  const handleMonthlySubmit = (data: CreateMonthlyGoalRequest) => {
    createMonthlyGoal.mutate({
      ...data,
      targetQuantity: data.targetQuantity || 1,
    }, {
      onSuccess: () => {
        toast({
          title: "成功",
          description: "月間目標を作成しました",
        });
        monthlyForm.reset();
        onOpenChange(false);
      },
      onError: () => {
        toast({
          title: "エラー",
          description: "月間目標の作成に失敗しました",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新規目標作成</DialogTitle>
        </DialogHeader>

        <Tabs value={goalType} onValueChange={(v) => setGoalType(v as "debt" | "monthly")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="debt">負債目標</TabsTrigger>
            <TabsTrigger value="monthly">月間目標</TabsTrigger>
          </TabsList>

          <TabsContent value="debt">
            <Form {...debtForm}>
              <form onSubmit={debtForm.handleSubmit(handleDebtSubmit)} className="space-y-4">
                <FormField
                  control={debtForm.control}
                  name="activityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>アクティビティ</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="アクティビティを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activities.map((activity) => (
                            <SelectItem key={activity.id} value={activity.id}>
                              {activity.emoji} {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={debtForm.control}
                  name="dailyTargetQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>日次目標量</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="例: 10"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : Number(value));
                          }}
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={debtForm.control}
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
                  control={debtForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>終了日（オプション）</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={debtForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>説明（オプション）</FormLabel>
                      <FormControl>
                        <Input placeholder="目標の説明を入力" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      キャンセル
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={createDebtGoal.isPending}>
                    作成
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="monthly">
            <Form {...monthlyForm}>
              <form onSubmit={monthlyForm.handleSubmit(handleMonthlySubmit)} className="space-y-4">
                <FormField
                  control={monthlyForm.control}
                  name="activityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>アクティビティ</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="アクティビティを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activities.map((activity) => (
                            <SelectItem key={activity.id} value={activity.id}>
                              {activity.emoji} {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={monthlyForm.control}
                  name="targetQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>目標量</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="例: 300"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : Number(value));
                          }}
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={monthlyForm.control}
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
                  control={monthlyForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>説明（オプション）</FormLabel>
                      <FormControl>
                        <Input placeholder="目標の説明を入力" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      キャンセル
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={createMonthlyGoal.isPending}>
                    作成
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};