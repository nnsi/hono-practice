import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NOTIFICATION_ENABLED_KEY = "actiko-goal-notification-enabled";

/** 通知が設定でオンになっているか */
export async function isGoalNotificationEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
  return raw === "true";
}

/** 通知設定を保存 */
export async function setGoalNotificationEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, String(enabled));
  if (!enabled) {
    await cancelGoalNotification();
  }
}

/** 通知パーミッションをリクエスト。許可されたら true */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * 指定秒数後に目標達成間近のローカル通知をスケジュール。
 * 既存の目標通知はキャンセルしてから新規登録する。
 */
export async function scheduleGoalNotification(
  activityName: string,
  triggerSeconds: number,
): Promise<string | null> {
  const enabled = await isGoalNotificationEnabled();
  if (!enabled) return null;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return null;

  await cancelGoalNotification();

  if (triggerSeconds <= 0) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "目標達成まであと30分",
      body: `${activityName} の日次目標まであと少しです`,
      sound: Platform.OS === "android" ? undefined : "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.ceil(triggerSeconds),
      repeats: false,
    },
  });
  return id;
}

/** 目標関連の予約通知をすべてキャンセル */
export async function cancelGoalNotification(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
