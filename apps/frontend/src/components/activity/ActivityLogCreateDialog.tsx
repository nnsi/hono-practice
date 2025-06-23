import { useState, useEffect } from "react";
import { ActivityLogCreateFormBody } from "@frontend/components/activity/ActivityLogCreateForm";
import { Dialog, DialogContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@frontend/components/ui";
import { apiClient } from "@frontend/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import {
  type CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@dtos/request/CreateActivityLogRequest";
import type { GetActivityResponse } from "@dtos/response";
import {
  GetActivityLogResponseSchema,
  type GetActivityLogsResponse,
} from "@dtos/response/GetActivityLogsResponse";

import { useToast, Button, Form, FormField, FormControl, FormItem, FormLabel, RadioGroup, RadioGroupItem } from "@components/ui";
import { useTimer } from "@frontend/hooks/useTimer";
import { 
  isTimeUnit, 
  getTimeUnitType, 
  convertSecondsToUnit,
  generateTimeMemo 
} from "@frontend/utils/timeUtils";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";

export function ActivityLogCreateDialog({
  open,
  onOpenChange,
  activity,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: GetActivityResponse;
  date: Date;
}) {
  const [activeTab, setActiveTab] = useState("manual");
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  
  const form = useForm<CreateActivityLogRequest>({
    resolver: zodResolver(CreateActivityLogRequestSchema),
    defaultValues: {
      date: dayjs(date).format("YYYY-MM-DD"),
      quantity: 0,
      activityKindId: undefined,
    },
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  form.setValue("date", dayjs(date).format("YYYY-MM-DD"));

  // タイマー機能の有効判定
  const timerEnabled = isTimeUnit(activity.quantityUnit);
  const timeUnitType = getTimeUnitType(activity.quantityUnit);
  
  // デバッグ用
  console.log("ActivityLogCreateDialog - Activity:", activity.name, "Unit:", activity.quantityUnit, "Timer enabled:", timerEnabled);
  
  // タイマーフック
  const {
    isRunning,
    elapsedTime,
    start,
    stop,
    reset,
    getFormattedTime,
    getElapsedSeconds,
  } = useTimer(activity.id);

  // タイマー開始時に開始時刻を記録
  const handleTimerStart = () => {
    setTimerStartTime(new Date());
    start();
  };

  // タイマー停止時の処理
  const handleTimerStop = () => {
    stop();
  };

  // ダイアログを開いた時にタイマーが動いていたら自動的にタイマータブに切り替え
  useEffect(() => {
    if (open && isRunning && timerEnabled) {
      setActiveTab("timer");
    }
  }, [open, isRunning, timerEnabled]);

  const onSubmit = async (data: CreateActivityLogRequest) => {
    CreateActivityLogRequestSchema.parse(data);
    if (!date) {
      toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
      return;
    }
    const res = await apiClient.users["activity-logs"].$post({
      json: {
        ...data,
        activityId: activity.id,
      },
    });
    if (res.status !== 200) {
      return;
    }
    const json = await res.json();
    const parsedJson = GetActivityLogResponseSchema.safeParse(json);
    if (!parsedJson.success) {
      toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
      return;
    }
    form.reset();
    queryClient.setQueryData(
      ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      },
    );
    queryClient.setQueryData(
      ["activity-logs-monthly", dayjs(date).format("YYYY-MM")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      },
    );
    toast({
      title: "登録完了",
      description: "アクティビティを記録しました",
      variant: "default",
    });
    onOpenChange(false);
  };

  // タイマーからの記録
  const handleTimerSave = async () => {
    const seconds = getElapsedSeconds();
    const quantity = convertSecondsToUnit(seconds, timeUnitType);
    
    const endTime = new Date();
    const memo = timerStartTime 
      ? generateTimeMemo(timerStartTime, endTime)
      : undefined;

    const data: CreateActivityLogRequest = {
      ...form.getValues(),
      quantity,
      memo,
    };

    await onSubmit(data);
    reset();
    setTimerStartTime(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80 mt-[-0.5rem]">
        <p className="mb-3 font-bold">Record [{activity.name}]</p>
        
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
              />
            </TabsContent>
            
            <TabsContent value="timer" className="space-y-4">
              <div className="space-y-4">
                <TimerDisplay 
                  time={getFormattedTime()} 
                  isRunning={isRunning} 
                />
                
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
                      記録時間: {convertSecondsToUnit(getElapsedSeconds(), timeUnitType)} {activity.quantityUnit}
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
                                    field.value ? String(field.value) : undefined
                                  }
                                  className="flex flex-col space-y-1"
                                >
                                  {activity.kinds.map((kind) => (
                                    <FormItem
                                      key={kind.id}
                                      className="flex items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <RadioGroupItem value={String(kind.id)} />
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
                    >
                      記録する
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
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
