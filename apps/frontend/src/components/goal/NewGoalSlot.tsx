import { useState } from "react";

import { useCreateGoal } from "@frontend/hooks";
import { PlusIcon } from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";

import type { GetActivityResponse } from "@dtos/response";

import {
  Button,
  Card,
  CardContent,
  Form,
  FormControl,
  FormField,
  FormItem,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui";

type FormData = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
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
      dailyTargetQuantity: 1,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    },
  });

  const createGoal = useCreateGoal();

  // 選択された活動の単位を取得
  const selectedActivityId = form.watch("activityId");
  const selectedActivity = activities.find((a) => a.id === selectedActivityId);
  const quantityUnit = selectedActivity?.quantityUnit || "";

  const handleSubmit = (data: FormData) => {
    const quantity = data.dailyTargetQuantity;
    if (!quantity || quantity <= 0) {
      return;
    }

    createGoal.mutate(
      {
        activityId: data.activityId,
        dailyTargetQuantity: Number(quantity),
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
  };

  // 新規目標追加ボタンのクリックハンドラ
  const handleStartCreating = () => {
    setIsCreating(true);
  };

  // 活動選択時のハンドラ
  const handleActivityChange = (
    value: string,
    fieldOnChange: (value: string) => void,
  ) => {
    fieldOnChange(value);
    // 活動選択後、日次目標の入力欄にフォーカス
    setTimeout(() => {
      const targetInput = document.querySelector(
        'input[name="dailyTargetQuantity"]',
      ) as HTMLInputElement;
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }, 0);
  };

  // 日次目標数量の変更ハンドラ
  const handleTargetQuantityChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldOnChange: (value: string | number) => void,
  ) => {
    const value = e.target.value;
    fieldOnChange(value === "" ? "" : Number(value));
  };

  // キャンセルボタンのクリックハンドラ
  const handleCancel = () => {
    setIsCreating(false);
    form.reset();
  };

  if (!isCreating) {
    return (
      <Card
        onClick={handleStartCreating}
        className="w-full h-20 cursor-pointer shadow-sm rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md hover:border-gray-400 transition-all duration-200 group"
      >
        <CardContent className="flex items-center justify-center gap-2 p-0 h-full">
          <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          <span className="text-sm text-gray-500 group-hover:text-gray-700">
            新規目標を追加
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-full rounded-lg border-2 border-blue-300 bg-blue-50 animate-in slide-in-from-bottom-2 duration-200 p-4"
      >
        <div className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="activityId"
            render={({ field }) => (
              <FormItem>
                <Select
                  {...field}
                  onValueChange={(value) =>
                    handleActivityChange(value, field.onChange)
                  }
                >
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">日次目標:</span>
              <FormField
                control={form.control}
                name="dailyTargetQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="h-10 w-28 text-center"
                        onChange={(e) =>
                          handleTargetQuantityChange(e, field.onChange)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {quantityUnit && (
                <span className="text-sm text-muted-foreground">
                  {quantityUnit}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <label
                      htmlFor="startDate"
                      className="text-xs text-muted-foreground block mb-1"
                    >
                      開始日
                    </label>
                    <FormControl>
                      <Input
                        {...field}
                        id="startDate"
                        type="date"
                        className="h-10 w-full"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <label
                      htmlFor="endDate"
                      className="text-xs text-muted-foreground block mb-1"
                    >
                      終了日（任意）
                    </label>
                    <FormControl>
                      <Input
                        {...field}
                        id="endDate"
                        type="date"
                        className="h-10 w-full"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-2 justify-end">
            <Button
              type="submit"
              size="default"
              disabled={createGoal.isPending}
              className="h-10"
            >
              作成
            </Button>
            <Button
              type="button"
              size="default"
              variant="outline"
              onClick={handleCancel}
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
