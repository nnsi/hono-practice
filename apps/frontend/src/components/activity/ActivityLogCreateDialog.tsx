import { ActivityLogCreateFormBody } from "@frontend/components/activity/ActivityLogCreateForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@frontend/components/ui";
import { useActivityLogCreate } from "@frontend/hooks/feature/activity/useActivityLogCreate";
import { convertSecondsToUnit } from "@frontend/utils/timeUtils";

import type { GetActivityResponse } from "@dtos/response";

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  RadioGroup,
  RadioGroupItem,
} from "@components/ui";

import { TimerControls } from "./TimerControls";
import { TimerDisplay } from "./TimerDisplay";

export function ActivityLogCreateDialog({
  open,
  onOpenChange,
  activity,
  date,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: GetActivityResponse;
  date: Date;
  onSuccess?: () => void;
}) {
  const {
    activeTab,
    setActiveTab,
    form,
    timerEnabled,
    timeUnitType,
    isRunning,
    elapsedTime,
    isPending,
    handleTimerStart,
    handleTimerStop,
    handleTimerSave,
    onSubmit,
    getFormattedTime,
    getElapsedSeconds,
    reset,
  } = useActivityLogCreate(activity, date, open, onOpenChange, onSuccess);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80 mt-[-0.5rem]">
        <DialogHeader>
          <DialogTitle>Record [{activity.name}]</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>

        {timerEnabled ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">手動入力</TabsTrigger>
              <TabsTrigger value="timer">タイマー</TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <ActivityLogCreateFormBody
                form={form}
                activity={activity}
                onSubmit={onSubmit}
                isPending={isPending}
              />
            </TabsContent>

            <TabsContent value="timer" className="space-y-4">
              <div className="space-y-4">
                <TimerDisplay time={getFormattedTime()} isRunning={isRunning} />

                <TimerControls
                  isRunning={isRunning}
                  onStart={handleTimerStart}
                  onStop={handleTimerStop}
                  onReset={reset}
                  showReset={!isRunning && elapsedTime > 0}
                />

                {!isRunning && elapsedTime > 0 && (
                  <div className="space-y-3">
                    <div className="text-center text-sm text-muted-foreground">
                      記録時間:{" "}
                      {convertSecondsToUnit(getElapsedSeconds(), timeUnitType)}{" "}
                      {activity.quantityUnit}
                    </div>

                    {activity.kinds.length > 0 && (
                      <Form {...form}>
                        <FormField
                          control={form.control}
                          name="activityKindId"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={
                                    field.value
                                      ? String(field.value)
                                      : undefined
                                  }
                                  className="flex flex-col space-y-1"
                                >
                                  {activity.kinds.map((kind) => (
                                    <FormItem
                                      key={kind.id}
                                      className="flex items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <RadioGroupItem
                                          value={String(kind.id)}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {kind.name}
                                      </FormLabel>
                                    </FormItem>
                                  ))}
                                </RadioGroup>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </Form>
                    )}

                    <Button
                      onClick={handleTimerSave}
                      variant="secondary"
                      className="w-full"
                      disabled={isPending}
                    >
                      {isPending ? "記録中..." : "記録する"}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <ActivityLogCreateFormBody
            form={form}
            activity={activity}
            onSubmit={onSubmit}
            isPending={isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
