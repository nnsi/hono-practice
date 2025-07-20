import { useEffect, useState } from "react";

import { useCreateActivityLog } from "@frontend/hooks/sync/useSyncedActivityLog";
import { useTimer } from "@frontend/hooks/useTimer";
import {
  convertSecondsToUnit,
  generateTimeMemo,
  getTimeUnitType,
  isTimeUnit,
} from "@frontend/utils/timeUtils";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import {
  type CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@dtos/request/CreateActivityLogRequest";
import type { GetActivityResponse } from "@dtos/response";

import { useToast } from "@components/ui";

export const useActivityLogCreate = (
  activity: GetActivityResponse,
  date: Date,
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onSuccess?: () => void,
) => {
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
  const { toast } = useToast();
  const createActivityLogMutation = useCreateActivityLog();

  form.setValue("date", dayjs(date).format("YYYY-MM-DD"));

  // タイマー機能の有効判定
  const timerEnabled = isTimeUnit(activity.quantityUnit);
  const timeUnitType = getTimeUnitType(activity.quantityUnit);

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

    try {
      await createActivityLogMutation.mutateAsync({
        activityId: activity.id,
        date: data.date,
        quantity: data.quantity,
        activityKindId: data.activityKindId,
        memo: data.memo,
        activityInfo: {
          name: activity.name,
          quantityUnit: activity.quantityUnit,
          emoji: activity.emoji || "",
          kinds: activity.kinds,
        },
      });

      form.reset();

      // キャッシュの更新はuseSyncedActivityLogのonSuccessで行われるため、ここでは不要
      // オフライン時はカスタムイベントによってUIが更新される

      toast({
        title: "登録完了",
        description: "アクティビティを記録しました",
        variant: "default",
      });

      // mutateAsyncが完了した後、少し待機してから画面を更新
      // オフライン時のlocalStorage書き込みが完了するまでの時間を確保
      setTimeout(() => {
        // onSuccessを呼び出してActivityRegistPageにも通知
        onSuccess?.();

        // ダイアログを閉じる
        onOpenChange(false);
      }, 100);
    } catch (error) {
      toast({
        title: "エラー",
        description: "アクティビティの記録に失敗しました",
        variant: "destructive",
      });
    }
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

  return {
    // State
    activeTab,
    setActiveTab,
    timerStartTime,

    // Form
    form,

    // Timer related
    timerEnabled,
    timeUnitType,
    isRunning,
    elapsedTime,

    // Handlers
    handleTimerStart,
    handleTimerStop,
    handleTimerSave,
    onSubmit,

    // Timer functions
    getFormattedTime,
    getElapsedSeconds,
    reset,
  };
};
