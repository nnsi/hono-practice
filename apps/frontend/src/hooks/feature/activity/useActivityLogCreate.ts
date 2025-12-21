import { useEffect, useState } from "react";

import { useToast } from "@components/ui";
import {
  type CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@dtos/request/CreateActivityLogRequest";
import type { GetActivityResponse } from "@dtos/response";
import { useCreateActivityLog } from "@frontend/hooks/api/useActivityLogs";
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

export const useActivityLogCreate = (
  activity: GetActivityResponse,
  date: Date,
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onSuccess?: () => void,
) => {
  const [activeTab, setActiveTab] = useState("manual");

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
    getStartTime,
  } = useTimer(activity.id);

  // タイマー開始時に開始時刻を記録
  const handleTimerStart = () => {
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

    // 既にリクエスト中の場合は処理しない
    if (createActivityLogMutation.isPending) {
      return;
    }

    try {
      await createActivityLogMutation.mutateAsync({
        activityId: activity.id,
        date: data.date,
        quantity: data.quantity,
        activityKindId: data.activityKindId,
        memo: data.memo,
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
    } catch (_error) {
      toast({
        title: "エラー",
        description: "アクティビティの記録に失敗しました",
        variant: "destructive",
      });
    }
  };

  // タイマーからの記録
  const handleTimerSave = async () => {
    // 既にリクエスト中の場合は処理しない
    if (createActivityLogMutation.isPending) {
      return;
    }

    const seconds = getElapsedSeconds();
    const quantity = convertSecondsToUnit(seconds, timeUnitType);

    const endTime = new Date();
    const startTimeStamp = getStartTime();
    const timerStartTime = startTimeStamp ? new Date(startTimeStamp) : null;
    const memo = timerStartTime
      ? generateTimeMemo(timerStartTime, endTime)
      : undefined;

    // タイマー開始時の日付を使用
    const recordDate = timerStartTime
      ? dayjs(timerStartTime).format("YYYY-MM-DD")
      : form.getValues().date;

    const data: CreateActivityLogRequest = {
      ...form.getValues(),
      date: recordDate,
      quantity,
      memo,
    };

    await onSubmit(data);
    reset();
  };

  return {
    // State
    activeTab,
    setActiveTab,

    // Form
    form,

    // Timer related
    timerEnabled,
    timeUnitType,
    isRunning,
    elapsedTime,

    // Mutation status
    isPending: createActivityLogMutation.isPending,

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
