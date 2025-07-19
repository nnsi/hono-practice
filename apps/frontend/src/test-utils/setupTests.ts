import { configure } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// React Testing Libraryの設定
configure({
  // act()警告をより適切に扱う
  asyncUtilTimeout: 2000,
});

// グローバルなテストセットアップ
beforeEach(() => {
  // localStorageのモック
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      },
    };
  })();

  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
});

afterEach(() => {
  // 各テスト後にlocalStorageをクリア
  localStorage.clear();
});

// Consoleエラーを一時的に抑制（開発中のみ）
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: any[]) => {
    // act()警告を一時的に抑制
    if (
      typeof args[0] === "string" &&
      args[0].includes("was not wrapped in act")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});
