// Export all adapter types
export type {
  AlertOptions,
  EventBusAdapter,
  NetworkAdapter,
  NotificationAdapter,
  PlatformAdapters,
  StorageAdapter,
  TimerAdapter,
  ToastOptions,
} from "./types";

// Export Web adapter factory functions
export {
  createWebEventBusAdapter,
  createWebNetworkAdapter,
  createWebNotificationAdapter,
  createWebStorageAdapter,
  createWebTimerAdapter,
} from "./web";

// Export React Native adapter factory functions
export {
  createReactNativeEventBusAdapter,
  createReactNativeNetworkAdapter,
  createReactNativeNotificationAdapter,
  createReactNativeStorageAdapter,
  createReactNativeTimerAdapter,
} from "./react-native";
