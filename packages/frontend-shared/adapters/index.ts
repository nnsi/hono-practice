// Export all adapter types
export type {
  AlertOptions,
  EventBusAdapter,
  FileAdapter,
  FormAdapter,
  FormAdapterWithFieldArray,
  FormFieldArrayOperations,
  FormFieldMeta,
  FormFieldOptions,
  NavigationAdapter,
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
  createWebFormAdapter,
  createWebNavigationAdapter,
  createWebNetworkAdapter,
  createWebNotificationAdapter,
  createWebStorageAdapter,
  createWebTimerAdapter,
} from "./web";

// Export React Native adapter factory functions
export {
  createReactNativeEventBusAdapter,
  createReactNativeFormAdapter,
  createReactNativeNavigationAdapter,
  createReactNativeNetworkAdapter,
  createReactNativeNotificationAdapter,
  createReactNativeStorageAdapter,
  createReactNativeTimerAdapter,
} from "./react-native";
