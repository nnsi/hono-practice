import { act } from "react";

import { waitFor as originalWaitFor } from "@testing-library/react";

import type { waitForOptions } from "@testing-library/react";

/**
 * React 19対応のwaitForラッパー
 * 非同期処理の完了を待つ際にact()警告を回避
 */
export async function waitForWithAct<T>(
  callback: () => T | Promise<T>,
  options?: waitForOptions,
): Promise<T> {
  // waitFor自体が既にact()を内部で使用しているため、
  // 追加のact()ラップは不要
  return originalWaitFor(callback, options);
}

/**
 * イベントディスパッチをact()でラップするヘルパー
 */
export function dispatchEventWithAct(element: EventTarget, event: Event): void {
  act(() => {
    element.dispatchEvent(event);
  });
}

/**
 * 非同期処理を含むテストのためのヘルパー
 * 指定時間待機してact()で状態更新をフラッシュ
 */
export async function flushPromisesWithAct(delay = 0): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
  });
}
