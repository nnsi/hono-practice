import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  Input,
} from "@components/ui";
import type { GetActivityResponse } from "@dtos/response";
import type { useNewGoalCard } from "@frontend/hooks/feature/goal/useNewGoalCard";
import { CheckIcon, Cross2Icon, TrashIcon } from "@radix-ui/react-icons";

import { ActivityIcon } from "../common/ActivityIcon";

export type GoalCardEditFormProps = {
  activityName: string;
  activityEmoji: string;
  quantityUnit: string;
  activity?: GetActivityResponse;
  hideGraph: boolean;
  hookValues: ReturnType<typeof useNewGoalCard>;
  onEditEnd: () => void;
};

export const GoalCardEditForm: React.FC<GoalCardEditFormProps> = ({
  activityName,
  activityEmoji,
  quantityUnit,
  activity,
  hideGraph,
  hookValues,
  onEditEnd,
}) => {
  const {
    isAnimating,
    form,
    statusInfo,
    progressPercentage,
    progressColor,
    updateGoal,
    handleUpdate,
    handleTargetQuantityChange,
    handleDeleteClick,
  } = hookValues;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleUpdate)}
        className={`relative w-full h-20 rounded-lg border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} shadow-sm animate-in zoom-in-95 duration-200 overflow-hidden`}
      >
        {!hideGraph && (
          <div
            className={`absolute inset-0 ${
              isAnimating ? "transition-all duration-1000 ease-out" : ""
            }`}
            style={{
              background: `linear-gradient(to right, ${progressColor} ${progressPercentage}%, white ${progressPercentage}%)`,
            }}
          />
        )}
        <div className="absolute inset-0 px-3 py-2 flex items-center gap-2">
          {activity ? (
            <ActivityIcon
              activity={activity}
              size="medium"
              className="flex-shrink-0"
            />
          ) : (
            <p className="text-xl sm:text-2xl flex-shrink-0">{activityEmoji}</p>
          )}
          <p className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">
            {activityName}
          </p>

          <div className="flex items-center gap-1 flex-1">
            <div className="min-w-[90px] max-w-[110px]">
              <FormField
                control={form.control}
                name="dailyTargetQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="h-8 text-center text-base"
                        onChange={(e) =>
                          handleTargetQuantityChange(e, field.onChange)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {quantityUnit}
            </span>
          </div>

          <div className="flex gap-1 ml-auto">
            <Button
              type="submit"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={updateGoal.isPending}
              title="保存"
            >
              <CheckIcon className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEditEnd}
              className="h-8 w-8 p-0"
              title="キャンセル"
            >
              <Cross2Icon className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDeleteClick}
              className="h-8 w-8 p-0"
              title="削除"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};
