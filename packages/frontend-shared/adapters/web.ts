import type {
  EventBusAdapter,
  NetworkAdapter,
  NotificationAdapter,
  StorageAdapter,
  TimerAdapter,
} from "./types";

// Web Storage adapter using localStorage
export class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("Failed to get item from localStorage:", error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error("Failed to get all keys from localStorage:", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}

// Web Network adapter using navigator.onLine
export class WebNetworkAdapter implements NetworkAdapter {
  isOnline(): boolean {
    return navigator.onLine;
  }

  addListener(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }
}

// Web Notification adapter
export class WebNotificationAdapter implements NotificationAdapter {
  private toastCallback?: (options: any) => void;

  setToastCallback(callback: (options: any) => void) {
    this.toastCallback = callback;
  }

  toast(options: any): void {
    if (this.toastCallback) {
      this.toastCallback(options);
    } else {
      // Fallback to console if no toast UI is available
      console.log(`[Toast] ${options.title}:`, options.description);
    }
  }

  async alert(title: string, message?: string): Promise<void> {
    window.alert(message || title);
  }

  async confirm(title: string, message?: string): Promise<boolean> {
    return window.confirm(message || title);
  }
}

// Web Event Bus adapter
export class WebEventBusAdapter implements EventBusAdapter {
  private listeners = new Map<string, Set<(data?: unknown) => void>>();

  emit(event: string, data?: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  on(event: string, handler: (data?: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return cleanup function
    return () => this.off(event, handler);
  }

  off(event: string, handler: (data?: unknown) => void): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }
}

// Web Timer adapter
export class WebTimerAdapter implements TimerAdapter<number> {
  setInterval(callback: () => void, ms: number): number {
    return window.setInterval(callback, ms);
  }

  clearInterval(id: number): void {
    window.clearInterval(id);
  }
}
