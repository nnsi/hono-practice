import type {
  NetworkAdapter,
  NotificationAdapter,
  StorageAdapter,
  TimerAdapter,
} from "./types";

// Type definitions for React Native dependencies
type AsyncStorageType = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
};

type NetInfoType = {
  addEventListener: (
    listener: (state: { isConnected: boolean | null }) => void,
  ) => () => void;
  fetch: () => Promise<{ isConnected: boolean | null }>;
};

type AlertType = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: "default" | "cancel" | "destructive";
    }>,
  ) => void;
};

// React Native Storage adapter
export function createReactNativeStorageAdapter(
  asyncStorage: AsyncStorageType,
): StorageAdapter {
  const getItem = async (key: string): Promise<string | null> => {
    try {
      return await asyncStorage.getItem(key);
    } catch (error) {
      console.error("Failed to get item from AsyncStorage:", error);
      return null;
    }
  };

  const setItem = async (key: string, value: string): Promise<void> => {
    try {
      await asyncStorage.setItem(key, value);
    } catch (error) {
      console.error("Failed to set item in AsyncStorage:", error);
      throw error;
    }
  };

  const removeItem = async (key: string): Promise<void> => {
    try {
      await asyncStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to remove item from AsyncStorage:", error);
      throw error;
    }
  };

  const getAllKeys = async (): Promise<string[]> => {
    try {
      return await asyncStorage.getAllKeys();
    } catch (error) {
      console.error("Failed to get all keys from AsyncStorage:", error);
      return [];
    }
  };

  const clear = async (): Promise<void> => {
    try {
      const keys = await asyncStorage.getAllKeys();
      await Promise.all(keys.map((key) => asyncStorage.removeItem(key)));
    } catch (error) {
      console.error("Failed to clear AsyncStorage:", error);
      throw error;
    }
  };

  return {
    getItem,
    setItem,
    removeItem,
    getAllKeys,
    clear,
  };
}

// React Native Network adapter
export function createReactNativeNetworkAdapter(
  netInfo: NetInfoType,
): NetworkAdapter {
  let isConnected = true;

  // Initialize connection state
  netInfo.fetch().then((state) => {
    isConnected = state.isConnected ?? true;
  });

  const isOnline = (): boolean => {
    return isConnected;
  };

  const addListener = (callback: (isOnline: boolean) => void): (() => void) => {
    const unsubscribe = netInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      isConnected = connected;
      callback(connected);
    });

    // Fetch initial state
    netInfo.fetch().then((state) => {
      const connected = state.isConnected ?? true;
      isConnected = connected;
      callback(connected);
    });

    return unsubscribe;
  };

  return {
    isOnline,
    addListener,
  };
}

// React Native Notification adapter
export function createReactNativeNotificationAdapter(
  Alert: AlertType,
): NotificationAdapter {
  const toast = (options: any): void => {
    // React Native doesn't have built-in toast, use Alert as fallback
    Alert.alert(options.title, options.description);
  };

  const alert = async (title: string, message?: string): Promise<void> => {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        {
          text: "OK",
          onPress: () => resolve(),
        },
      ]);
    });
  };

  const confirm = async (title: string, message?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        {
          text: "Cancel",
          onPress: () => resolve(false),
          style: "cancel",
        },
        {
          text: "OK",
          onPress: () => resolve(true),
        },
      ]);
    });
  };

  return {
    toast,
    alert,
    confirm,
  };
}

// React Native Event Bus adapter - can reuse the web implementation
export { createWebEventBusAdapter as createReactNativeEventBusAdapter } from "./web";

// React Native Timer adapter
export function createReactNativeTimerAdapter(): TimerAdapter<NodeJS.Timeout> {
  const setIntervalFn = (callback: () => void, ms: number): NodeJS.Timeout => {
    return setInterval(callback, ms);
  };

  const clearIntervalFn = (id: NodeJS.Timeout): void => {
    clearInterval(id);
  };

  return {
    setInterval: setIntervalFn,
    clearInterval: clearIntervalFn,
  };
}
