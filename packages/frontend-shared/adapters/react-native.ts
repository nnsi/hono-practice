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
export class ReactNativeStorageAdapter implements StorageAdapter {
  constructor(private asyncStorage: AsyncStorageType) {}

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.asyncStorage.getItem(key);
    } catch (error) {
      console.error("Failed to get item from AsyncStorage:", error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.asyncStorage.setItem(key, value);
    } catch (error) {
      console.error("Failed to set item in AsyncStorage:", error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.asyncStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to remove item from AsyncStorage:", error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return await this.asyncStorage.getAllKeys();
    } catch (error) {
      console.error("Failed to get all keys from AsyncStorage:", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.asyncStorage.getAllKeys();
      await Promise.all(keys.map((key) => this.asyncStorage.removeItem(key)));
    } catch (error) {
      console.error("Failed to clear AsyncStorage:", error);
      throw error;
    }
  }
}

// React Native Network adapter
export class ReactNativeNetworkAdapter implements NetworkAdapter {
  private isConnected = true;

  constructor(private netInfo: NetInfoType) {
    // Initialize connection state
    this.netInfo.fetch().then((state) => {
      this.isConnected = state.isConnected ?? true;
    });
  }

  isOnline(): boolean {
    return this.isConnected;
  }

  addListener(callback: (isOnline: boolean) => void): () => void {
    const unsubscribe = this.netInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      this.isConnected = connected;
      callback(connected);
    });

    // Fetch initial state
    this.netInfo.fetch().then((state) => {
      const connected = state.isConnected ?? true;
      this.isConnected = connected;
      callback(connected);
    });

    return unsubscribe;
  }
}

// React Native Notification adapter
export class ReactNativeNotificationAdapter implements NotificationAdapter {
  constructor(private Alert: AlertType) {}

  toast(options: any): void {
    // React Native doesn't have built-in toast, use Alert as fallback
    this.Alert.alert(options.title, options.description);
  }

  async alert(title: string, message?: string): Promise<void> {
    return new Promise((resolve) => {
      this.Alert.alert(title, message, [
        {
          text: "OK",
          onPress: () => resolve(),
        },
      ]);
    });
  }

  async confirm(title: string, message?: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.Alert.alert(title, message, [
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
  }
}

// React Native Event Bus adapter - can reuse the web implementation
export { WebEventBusAdapter as ReactNativeEventBusAdapter } from "./web";

// React Native Timer adapter
export class ReactNativeTimerAdapter implements TimerAdapter<NodeJS.Timeout> {
  setInterval(callback: () => void, ms: number): NodeJS.Timeout {
    return setInterval(callback, ms);
  }

  clearInterval(id: NodeJS.Timeout): void {
    clearInterval(id);
  }
}
