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
    },
  });

  const { mutate: createDebtGoal, isPending: isCreatingDebt } =
    useCreateDebtGoal();
  const { mutate: createMonthlyGoal, isPending: isCreatingMonthly } =
    useCreateMonthlyGoal();
  const selectedType = form.watch("type");
  const isPending = isCreatingDebt || isCreatingMonthly;

  const handleSubmit = (data: FormData) => {
    if (data.type === "debt" && data.dailyTargetQuantity) {
      createDebtGoal(
        {
          activityId: data.activityId,
          dailyTargetQuantity: data.dailyTargetQuantity,
          startDate: new Date().toISOString().split("T")[0],
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
        className="relative w-full pb-[100%] rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 group flex flex-col items-center justify-center"
      >
        <PlusIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-gray-400 group-hover:text-gray-600 mb-2" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-8 text-sm text-gray-500 group-hover:text-gray-700">
          新規目標
        </span>
      </button>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="relative w-full pb-[100%] rounded-2xl border-2 border-blue-300 bg-blue-50 animate-in slide-in-from-bottom-2 duration-200"
      >
        <div className="absolute inset-0 p-4 flex flex-col">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="mb-2">
                <FormControl>
                  <RadioGroup
                    {...field}
                    className="flex flex-col gap-1"
                    onValueChange={field.onChange}
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <RadioGroupItem value="debt" className="w-3 h-3" />
                      <span>負債型</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <RadioGroupItem
                        value="monthly_target"
                        className="w-3 h-3"
                      />
                      <span>月間型</span>
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
              <FormItem className="mb-2">
                <Select {...field} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="活動選択" />
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

          {selectedType === "debt" ? (
            <FormField
              control={form.control}
              name="dailyTargetQuantity"
              render={({ field }) => (
                <FormItem className="mb-2">
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder="日目標"
                      className="h-8 text-xs"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ) : (
            <>
              <FormField
                control={form.control}
                name="targetQuantity"
                render={({ field }) => (
                  <FormItem className="mb-1">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="月目標"
                        className="h-8 text-xs"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetMonth"
                render={({ field }) => (
                  <FormItem className="mb-2">
                    <FormControl>
                      <Input {...field} type="month" className="h-8 text-xs" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </>
          )}

          <div className="flex gap-1 mt-auto">
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="flex-1 h-7 text-xs"
            >
              作成
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                form.reset();
              }}
              className="flex-1 h-7 text-xs"
            >
              取消
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};
