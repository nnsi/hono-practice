import { useCallback, useMemo } from "react";

import { createEventBusAdapter } from "@frontend/adapters/EventBusAdapter";
import { useEventBus } from "@frontend/providers/EventBusProvider";
import {
  createWebNotificationAdapter,
  createWebStorageAdapter,
  createWebTimerAdapter,
} from "@packages/frontend-shared/adapters";
import { createUseTimer } from "@packages/frontend-shared/hooks";

import { useToast } from "@components/ui";

import type { TimerAdapter } from "@packages/frontend-shared/adapters";
import type { UseTimerReturn as BaseUseTimerReturn } from "@packages/frontend-shared/hooks";

// Web環境用のadaptersをシングルトンとして作成
const storage = createWebStorageAdapter();
const timer = createWebTimerAdapter() as TimerAdapter<unknown>;

// Web版の戻り値の型（startメソッドを同期的にする）
type UseTimerReturn = Omit<BaseUseTimerReturn, "start"> & {
  start: () => void;
};

export const useTimer = (activityId: string): UseTimerReturn => {
  const { toast } = useToast();
  const eventBus = useEventBus();
  const eventBusAdapter = createEventBusAdapter(eventBus);

  // NotificationAdapterはtoast関数を使うため、毎回新しいインスタンスを作成
  const notification = useMemo(() => {
    const adapter = createWebNotificationAdapter();
    adapter.setToastCallback(toast);
    return adapter;
  }, [toast]);

  const timerHook = createUseTimer({
    activityId,
    storage,
    notification,
    eventBus: eventBusAdapter,
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
