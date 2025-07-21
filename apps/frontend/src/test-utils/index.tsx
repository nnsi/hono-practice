export * from "./testData";
export * from "./MockAuthProvider";
export * from "./MockTokenProvider";
export * from "./MockNetworkStatusProvider";
export * from "./MockSyncManager";
export { renderHookWithAct, renderHookWithActSync } from "./renderWithAct";
export * from "./waitForWithAct";

import type { ReactElement, ReactNode } from "react";

import { type RenderOptions, render } from "@testing-library/react";
import { vi } from "vitest";

// カスタムレンダラーを作成（プロバイダーラップ用）
export type CustomRenderOptions = Omit<RenderOptions, "wrapper"> & {
  providers?: ReactNode;
};

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions,
) {
  const { providers, ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: ReactNode }) => {
    return providers ? (
      <>
        {providers}
        {children}
      </>
    ) : (
      <>{children}</>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// テスト用のapiClientモック作成ヘルパー
export function createMockApiClient() {
  return {
    auth: {
      login: {
        $post: vi.fn(),
      },
      logout: {
        $post: vi.fn(),
      },
      token: {
        $post: vi.fn(),
      },
      google: {
        link: {
          $post: vi.fn(),
        },
      },
    },
    user: {
      me: {
        $get: vi.fn(),
      },
    },
    activity: {
      $get: vi.fn(),
      $post: vi.fn(),
      _activityId: vi.fn(() => ({
        $put: vi.fn(),
        $delete: vi.fn(),
      })),
    },
    activityLog: {
      $get: vi.fn(),
      $post: vi.fn(),
      _activityLogId: vi.fn(() => ({
        $put: vi.fn(),
        $delete: vi.fn(),
      })),
    },
    task: {
      $get: vi.fn(),
      $post: vi.fn(),
      _taskId: vi.fn(() => ({
        $put: vi.fn(),
        $delete: vi.fn(),
      })),
    },
    goal: {
      $get: vi.fn(),
      $post: vi.fn(),
      _goalId: vi.fn(() => ({
        $put: vi.fn(),
        $delete: vi.fn(),
      })),
    },
    sync: {
      batch: {
        $post: vi.fn(),
      },
    },
    batch: {
      $post: vi.fn(),
    },
    users: {
      sync: {
        batch: {
          $post: vi.fn(),
        },
        "check-duplicates": {
          $post: vi.fn(),
        },
        pull: {
          $get: vi.fn(),
        },
      },
      "activity-logs": {
        stats: {
          $get: vi.fn(),
        },
      },
      activities: {
        $get: vi.fn(),
        ":id": {
          $put: vi.fn(),
          $delete: vi.fn(),
        },
      },
      "api-keys": {
        $get: vi.fn(),
        $post: vi.fn(),
        ":id": {
          $delete: vi.fn(),
        },
      },
      tasks: {
        $post: vi.fn(),
        ":id": {
          $put: vi.fn(),
          $delete: vi.fn(),
        },
      },
      subscription: {
        $get: vi.fn(),
      },
    },
  };
}

// テスト用のイベントバスモック
export function createMockEventBus() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  return {
    emit: vi.fn((event: string, ...args: any[]) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach((listener) => listener(...args));
      }
    }),
    on: vi.fn((event: string, listener: (...args: any[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(listener);
      return () => {
        listeners.get(event)?.delete(listener);
      };
    }),
    off: vi.fn((event: string, listener: (...args: any[]) => void) => {
      listeners.get(event)?.delete(listener);
    }),
    removeAllListeners: vi.fn((event?: string) => {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    }),
  };
}

// テスト用のストレージモック
export function createMockStorage() {
  const storage = new Map<string, string>();

  const mockStorage = {
    getItem: vi.fn((key: string) => storage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    get length() {
      return storage.size;
    },
    key: vi.fn((index: number) => {
      const keys = Array.from(storage.keys());
      return keys[index] || null;
    }),
  };

  // Object.keysが動作するように、ストレージのキーをオブジェクトのプロパティとして追加
  Object.defineProperty(mockStorage, "keys", {
    get() {
      return Array.from(storage.keys());
    },
  });

  // Object.keys()をサポートするためのProxy
  return new Proxy(mockStorage, {
    ownKeys(target) {
      // 既存のプロパティとストレージのキーを両方返す
      const targetKeys = Reflect.ownKeys(target);
      const storageKeys = Array.from(storage.keys());
      return [...new Set([...targetKeys, ...storageKeys])];
    },
    getOwnPropertyDescriptor(target, key) {
      if (storage.has(String(key))) {
        return {
          enumerable: true,
          configurable: true,
          value: storage.get(String(key)),
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    has(target, key) {
      return storage.has(String(key)) || Reflect.has(target, key);
    },
    get(target, key) {
      if (storage.has(String(key))) {
        return storage.get(String(key));
      }
      return Reflect.get(target, key);
    },
  });
}

// テスト用のタイムプロバイダーモック
export function createMockTimeProvider(initialTime: number = Date.now()) {
  let currentTime = initialTime;
  const timers = new Map<number, { callback: () => void; time: number }>();
  const intervals = new Map<number, { callback: () => void; delay: number }>();
  let nextTimerId = 1;

  const advanceTime = (ms: number) => {
    currentTime += ms;
    // 期限が来たタイマーを実行
    for (const [id, timer] of timers.entries()) {
      if (timer.time <= currentTime) {
        timer.callback();
        timers.delete(id);
      }
    }
    // インターバルを処理
    for (const [, interval] of intervals.entries()) {
      // インターバルは繰り返し実行される
      const elapsed = currentTime - initialTime;
      const timesToRun = Math.floor(elapsed / interval.delay);
      if (timesToRun > 0) {
        interval.callback();
      }
    }
  };

  return {
    now: vi.fn(() => currentTime),
    setTimeout: vi.fn((callback: () => void, delay: number) => {
      const id = nextTimerId++;
      timers.set(id, { callback, time: currentTime + delay });
      return id;
    }),
    clearTimeout: vi.fn((id: number) => {
      timers.delete(id);
    }),
    setInterval: vi.fn((callback: () => void, delay: number) => {
      const id = nextTimerId++;
      intervals.set(id, { callback, delay });
      return id;
    }),
    clearInterval: vi.fn((id: number) => {
      intervals.delete(id);
    }),
    advance: advanceTime,
    setCurrentTime: (time: number) => {
      currentTime = time;
    },
  };
}
