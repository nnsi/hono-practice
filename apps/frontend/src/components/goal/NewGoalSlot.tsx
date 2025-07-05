import { useState } from "react";

import { useCreateDebtGoal, useCreateMonthlyGoal } from "@frontend/hooks";
import { PlusIcon } from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";

import type { GetActivityResponse } from "@dtos/response";

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  Input,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui";

type FormData = {
  type: "debt" | "monthly_target";
  activityId: string;
  dailyTargetQuantity?: number;
  targetQuantity?: number;
  targetMonth?: string;
  startDate?: string;
  endDate?: string;
};

type NewGoalSlotProps = {
  activities: GetActivityResponse[];
  onCreated: () => void;
};

export const NewGoalSlot: React.FC<NewGoalSlotProps> = ({
  activities,
  onCreated,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const form = useForm<FormData>({
    defaultValues: {
      type: "debt",
      dailyTargetQuantity: 1,
      targetQuantity: 30,
      targetMonth: new Date().toISOString().slice(0, 7),
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    },
  });

  const { mutate: createDebtGoal, isPending: isCreatingDebt } =
    useCreateDebtGoal();
  const { mutate: createMonthlyGoal, isPending: isCreatingMonthly } =
    useCreateMonthlyGoal();
  const selectedType = form.watch("type");
  const isPending = isCreatingDebt || isCreatingMonthly;

  const handleSubmit = (data: FormData) => {
    if (data.type === "debt" && data.dailyTargetQuantity && data.startDate) {
      createDebtGoal(
        {
          activityId: data.activityId,
          dailyTargetQuantity: data.dailyTargetQuantity,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
        },
        {
          onSuccess: () => {
            setIsCreating(false);
            form.reset();
            onCreated();
          },
        },
      );
    } else if (
      data.type === "monthly_target" &&
      data.targetQuantity &&
      data.targetMonth
    ) {
      createMonthlyGoal(
        {
          activityId: data.activityId,
          targetQuantity: data.targetQuantity,
          targetMonth: data.targetMonth,
        },
        {
          onSuccess: () => {
            setIsCreating(false);
            form.reset();
            onCreated();
          },
        },
      );
    }
  };

  if (!isCreating) {
    return (
      <button
        type="button"
        onClick={() => setIsCreating(true)}
        className="w-full h-20 rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 group flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        <span className="text-sm text-gray-500 group-hover:text-gray-700">
          新規目標を追加
        </span>
      </button>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-full rounded-lg border-2 border-blue-300 bg-blue-50 animate-in slide-in-from-bottom-2 duration-200 p-4"
      >
        <div className="flex flex-col gap-3">
          {/* 1行目: タイプ選択とアクティビティ選択 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="flex-shrink-0">
                  <FormControl>
                    <RadioGroup
                      {...field}
                      className="flex gap-4"
                      onValueChange={field.onChange}
                    >
                      <div className="flex items-center gap-1">
                        <RadioGroupItem value="debt" className="w-4 h-4" />
                        <span className="text-sm">負債型</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <RadioGroupItem
                          value="monthly_target"
                          className="w-4 h-4"
                        />
                        <span className="text-sm">月間型</span>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activityId"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <Select {...field} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="活動を選択" />
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
                </FormItem>
              )}
            />
          </div>

          {/* 2行目: 詳細入力 */}
          <div className="flex flex-col sm:flex-row gap-2">
            {selectedType === "debt" ? (
              <>
                <FormField
                  control={form.control}
                  name="dailyTargetQuantity"
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="日目標"
                          className="h-10"
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input {...field} type="date" className="h-10" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          placeholder="終了日（任意）"
                          className="h-10"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="targetQuantity"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="月目標"
                          className="h-10"
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetMonth"
                  render={({ field }) => (
                    <FormItem className="w-32">
                      <FormControl>
                        <Input {...field} type="month" className="h-10" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>

          {/* ボタン */}
          <div className="flex gap-2 justify-end">
            <Button
              type="submit"
              size="default"
              disabled={isPending}
              className="h-10"
            >
              作成
            </Button>
            <Button
              type="button"
              size="default"
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                form.reset();
              }}
              className="h-10"
            >
              取消
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};
