import { useCallback, useMemo } from "react";

import {
  WebEventBusAdapter,
  WebNotificationAdapter,
  WebStorageAdapter,
  WebTimerAdapter,
} from "@packages/frontend-shared/adapters/web";
import { createUseTimer } from "@packages/frontend-shared/hooks";

import { useToast } from "@components/ui";

import type { TimerAdapter } from "@packages/frontend-shared/adapters";
import type { UseTimerReturn as BaseUseTimerReturn } from "@packages/frontend-shared/hooks";

// Web環境用のadaptersをシングルトンとして作成
const storage = new WebStorageAdapter();
const eventBus = new WebEventBusAdapter();
const timer = new WebTimerAdapter() as TimerAdapter<unknown>;

// Web版の戻り値の型（startメソッドを同期的にする）
type UseTimerReturn = Omit<BaseUseTimerReturn, "start"> & {
  start: () => void;
};

export const useTimer = (activityId: string): UseTimerReturn => {
  const { toast } = useToast();

  // NotificationAdapterはtoast関数を使うため、毎回新しいインスタンスを作成
  const notification = useMemo(() => {
    const adapter = new WebNotificationAdapter();
    adapter.setToastCallback(toast);
    return adapter;
  }, [toast]);

  const timerHook = createUseTimer({
    activityId,
    storage,
    notification,
    eventBus,
    timer,
  });

  // startメソッドを同期的にラップ
  const start = useCallback(() => {
    // 非同期のstartを呼び出すが、戻り値は無視して同期的に扱う
    timerHook.start();
  }, [timerHook]);

  return {
    ...timerHook,
    start,
  };
};
