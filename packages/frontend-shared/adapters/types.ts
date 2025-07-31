// Platform adapter interfaces for cross-platform compatibility

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
};

export type AlertOptions = {
  title: string;
  message?: string;
  buttons?: Array<{
    text: string;
    style?: "default" | "cancel" | "destructive";
    onPress?: () => void;
  }>;
};

// Storage adapter for persistent data
export type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
  clear?: () => Promise<void>;
};

// Network status adapter
export type NetworkAdapter = {
  isOnline: () => boolean;
  addListener: (callback: (isOnline: boolean) => void) => () => void;
};

// User notification adapter
export type NotificationAdapter = {
  toast: (options: ToastOptions) => void;
  alert: (title: string, message?: string) => Promise<void>;
  confirm: (title: string, message?: string) => Promise<boolean>;
};

// Event bus adapter for cross-component communication
export type EventBusAdapter = {
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (data?: unknown) => void) => () => void;
  off: (event: string, handler: (data?: unknown) => void) => void;
};

// Timer adapter for platform-specific timer implementations
export type TimerAdapter<T = unknown> = {
  setInterval: (callback: () => void, ms: number) => T;
  clearInterval: (id: T) => void;
};

// Platform adapter collection
export type PlatformAdapters<T = unknown> = {
  storage: StorageAdapter;
  network: NetworkAdapter;
  notification: NotificationAdapter;
  eventBus?: EventBusAdapter;
  timer?: TimerAdapter<T>;
};
