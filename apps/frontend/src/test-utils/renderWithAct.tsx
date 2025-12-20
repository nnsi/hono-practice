import { act } from "react";

import type {
  RenderHookOptions,
  RenderHookResult,
} from "@testing-library/react";
import { renderHook as originalRenderHook } from "@testing-library/react";

/**
 * React 19対応のrenderHookラッパー
 * 初期レンダリングをact()でラップして警告を回避
 */
export async function renderHookWithAct<Result, Props>(
  render: (props: Props) => Result,
  options?: RenderHookOptions<Props>,
): Promise<RenderHookResult<Result, Props>> {
  let result!: RenderHookResult<Result, Props>;

  await act(async () => {
    result = originalRenderHook(render, options);
    // 初期レンダリング後のeffectの実行を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  // rerender関数もact()でラップ
  const originalRerender = result.rerender;
  result.rerender = (props?: Props) => {
    act(() => {
      originalRerender(props);
    });
  };

  // unmount関数もact()でラップ
  const originalUnmount = result.unmount;
  result.unmount = () => {
    act(() => {
      originalUnmount();
    });
  };

  return result;
}

/**
 * 同期的なrenderHookラッパー（後方互換性のため）
 */
export function renderHookWithActSync<Result, Props>(
  render: (props: Props) => Result,
  options?: RenderHookOptions<Props>,
): RenderHookResult<Result, Props> {
  let result!: RenderHookResult<Result, Props>;

  act(() => {
    result = originalRenderHook(render, options);
  });

  // rerender関数もact()でラップ
  const originalRerender = result.rerender;
  result.rerender = (props?: Props) => {
    act(() => {
      originalRerender(props);
    });
  };

  // unmount関数もact()でラップ
  const originalUnmount = result.unmount;
  result.unmount = () => {
    act(() => {
      originalUnmount();
    });
  };

  return result;
}
