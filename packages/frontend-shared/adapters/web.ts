import type {
  EventBusAdapter,
  NetworkAdapter,
  NotificationAdapter,
  StorageAdapter,
  TimerAdapter,
} from "./types";

// Web Storage adapter using localStorage
export function createWebStorageAdapter(): StorageAdapter {
  const getItem = async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("Failed to get item from localStorage:", error);
      return null;
    }
  };

  const setItem = async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
  };

  const removeItem = async (key: string): Promise<void> => {
    localStorage.removeItem(key);
  };

  const getAllKeys = async (): Promise<string[]> => {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error("Failed to get all keys from localStorage:", error);
      return [];
    }
  };

  const clear = async (): Promise<void> => {
    localStorage.clear();
  };

  return {
    getItem,
    setItem,
    removeItem,
    getAllKeys,
    clear,
  };
}

// Web Network adapter using navigator.onLine
export function createWebNetworkAdapter(): NetworkAdapter {
  const isOnline = (): boolean => {
    return navigator.onLine;
  };

  const addListener = (callback: (isOnline: boolean) => void): (() => void) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  };

  return {
    isOnline,
    addListener,
  };
}

// Web Notification adapter
export function createWebNotificationAdapter(): NotificationAdapter & {
  setToastCallback: (callback: (options: any) => void) => void;
} {
  let toastCallback: ((options: any) => void) | undefined;

  const setToastCallback = (callback: (options: any) => void) => {
    toastCallback = callback;
  };

  const toast = (options: any): void => {
    if (toastCallback) {
      toastCallback(options);
    } else {
      // Fallback to console if no toast UI is available
      console.log(`[Toast] ${options.title}:`, options.description);
    }
  };

  const alert = async (title: string, message?: string): Promise<void> => {
    window.alert(message || title);
  };

  const confirm = async (title: string, message?: string): Promise<boolean> => {
    return window.confirm(message || title);
  };

  return {
    toast,
    alert,
    confirm,
    setToastCallback,
  };
}

// Web Event Bus adapter
export function createWebEventBusAdapter(): EventBusAdapter {
  const listeners = new Map<string, Set<(data?: unknown) => void>>();

  const emit = (event: string, data?: unknown): void => {
    const handlers = listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  };

  const on = (
    event: string,
    handler: (data?: unknown) => void,
  ): (() => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler);

    // Return cleanup function
    return () => off(event, handler);
  };

  const off = (event: string, handler: (data?: unknown) => void): void => {
    const handlers = listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        listeners.delete(event);
      }
    }
  };

  return {
    emit,
    on,
    off,
  };
}

// Web Timer adapter
export function createWebTimerAdapter(): TimerAdapter<number> {
  const setInterval = (callback: () => void, ms: number): number => {
    return window.setInterval(callback, ms);
  };

  const clearInterval = (id: number): void => {
    window.clearInterval(id);
  };

  return {
    setInterval,
    clearInterval,
  };
}
