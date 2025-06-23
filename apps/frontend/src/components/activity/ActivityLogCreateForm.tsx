import { useState, useEffect } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import {
  type CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@dtos/request/CreateActivityLogRequest";
import type { GetActivityResponse } from "@dtos/response";
import { GetActivityLogResponseSchema } from "@dtos/response/GetActivityLogsResponse";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  useToast,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/ui";

import { useTimer } from "@frontend/hooks/useTimer";
import { 
  isTimeUnit, 
  getTimeUnitType, 
  convertSecondsToUnit,
  generateTimeMemo 
} from "@frontend/utils/timeUtils";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";

import type { UseFormReturn } from "react-hook-form";

type ActivityLogCreateFormProps = {
  activity: GetActivityResponse;
  date?: Date;
};

export const ActivityLogCreateForm: React.FC<ActivityLogCreateFormProps> = ({
  activity,
  date,
}) => {
  console.log("ActivityLogCreateForm rendered, activity:", activity);
  const api = apiClient;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [timer, setTimer] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);

  const form = useForm({
    resolver: zodResolver(CreateActivityLogRequestSchema),
    defaultValues: {
      date: dayjs(date).format("YYYY-MM-DD"),
      quantity: 0,
      activityKindId: undefined,
    },
  });

  form.setValue("date", dayjs(date).format("YYYY-MM-DD"));

  // タイマー機能の有効判定
  const timerEnabled = isTimeUnit(activity.quantityUnit);
  const timeUnitType = getTimeUnitType(activity.quantityUnit);
  
  // デバッグ用
  console.log("Activity:", activity.name, "Unit:", activity.quantityUnit, "Timer enabled:", timerEnabled);
  
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

  // タイマーからの記録
  const handleTimerSave = async () => {
    const seconds = getElapsedSeconds();
    const quantity = convertSecondsToUnit(seconds, timeUnitType);
    
    const endTime = new Date();
    const memo = timerStartTime && form.getValues("memo") 
      ? `${form.getValues("memo")} (${generateTimeMemo(timerStartTime, endTime)})`
      : timerStartTime 
      ? generateTimeMemo(timerStartTime, endTime)
      : form.getValues("memo");

    const data: CreateActivityLogRequest = {
      ...form.getValues(),
      quantity,
      memo,
    };

    await onSubmit(data);
    reset();
    setTimerStartTime(null);
    setIsOpen(false);
  };

  // ダイアログを開いた時にタイマーが動いていたら自動的にタイマータブに切り替え
  useEffect(() => {
    if (isOpen && isRunning && timerEnabled) {
      setActiveTab("timer");
    }
  }, [isOpen, isRunning, timerEnabled]);

  const onSubmit = async (data: CreateActivityLogRequest) => {
    CreateActivityLogRequestSchema.parse(data);
    if (!date) {
      return toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
    }
    const res = await api.users["activity-logs"].$post({
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
    await queryClient.invalidateQueries({
      queryKey: [
        "activity",
        "activity-logs-daily",
        dayjs(date).format("YYYY-MM-DD"),
      ],
    });
  };

  const handleMouseDown = () => {
    const LONG_PRESSED_TIME = 300;
    setTimer(performance.now() + LONG_PRESSED_TIME);
  };

  return (
    <Dialog key={activity.id} open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            if (performance.now() - timer > 0) {
              e.preventDefault();
              onSubmit(form.getValues());
            }
            setTimer(0);
          }}
          className="flex flex-wrap h-16 px-1"
        >
          <span className="text-xl w-full">{activity.emoji}</span>
          <span className="text-xs w-full">{activity.name}</span>
          {isRunning && timerEnabled && (
            <span className="text-[10px] w-full text-destructive font-bold">
              計測中
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-80 mt-[-0.5rem]">
        <p className="mb-3 font-bold">Record [{activity.name}]</p>
        
        {timerEnabled ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">手動入力</TabsTrigger>
              <TabsTrigger value="timer">タイマー</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <Input
                          type="number"
                          className="col-span-2"
                          inputMode="numeric"
                          autoComplete="off"
                          {...field}
                        />
                      )}
                    />
                    <Label className="col-span-1">{activity.quantityUnit}</Label>
                    {activity.kinds.length > 0 && (
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name="activityKindId"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
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
                      </div>
                    )}
                    <div className="col-span-3 text-center">
                      <DialogClose>
                        <Button type="submit" variant="secondary" className="w-full">
                          Record it!
                        </Button>
                      </DialogClose>
                    </div>
                  </div>
                </form>
              </Form>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-3 gap-3 items-center">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <Input
                      type="number"
                      className="col-span-2"
                      inputMode="numeric"
                      autoComplete="off"
                      {...field}
                    />
                  )}
                />
                <Label className="col-span-1">{activity.quantityUnit}</Label>
                {activity.kinds.length > 0 && (
                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name="activityKindId"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
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
                  </div>
                )}
                <div className="col-span-3 text-center">
                  <DialogClose>
                    <Button type="submit" variant="secondary" className="w-full">
                      Record it!
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export function ActivityLogCreateFormBody({
  form,
  activity,
  onSubmit,
}: {
  form: UseFormReturn<CreateActivityLogRequest, any, CreateActivityLogRequest>;
  activity: GetActivityResponse;
  onSubmit: (data: CreateActivityLogRequest) => Promise<void>;
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <p className="mb-3 font-bold">Record [{activity.name}]</p>
        <div className="grid grid-cols-3 gap-3 items-center">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <Input
                type="number"
                className="col-span-2"
                inputMode="numeric"
                autoComplete="off"
                {...field}
              />
            )}
          />
          <Label className="col-span-1">{activity.quantityUnit}</Label>
          {activity.kinds.length > 0 && (
            <div className="col-span-3">
              <FormField
                control={form.control}
                name="activityKindId"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
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
            </div>
          )}
          <div className="col-span-3 text-center">
            <Button type="submit" variant="secondary" className="w-full">
              Record it!
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
