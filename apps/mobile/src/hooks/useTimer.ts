import { useMemo } from "react";

import {
  ReactNativeEventBusAdapter,
  ReactNativeNotificationAdapter,
  ReactNativeStorageAdapter,
  ReactNativeTimerAdapter,
} from "@packages/frontend-shared/adapters/react-native";
import { createUseTimer } from "@packages/frontend-shared/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Alert } from "../utils/AlertWrapper";

import type { UseTimerReturn } from "@packages/frontend-shared/hooks";


// React Native環境用のadaptersをシングルトンとして作成
const storage = new ReactNativeStorageAdapter(AsyncStorage);
const eventBus = new ReactNativeEventBusAdapter();
const timer = new ReactNativeTimerAdapter();
const notification = new ReactNativeNotificationAdapter(Alert);

export const useTimer = (activityId: string): UseTimerReturn => {
  return createUseTimer({
    activityId,
    storage,
    notification,
    eventBus,
    timer,
  });
};
