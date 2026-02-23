import type { ReactElement, ReactNode } from "react";

import { type RenderOptions, render } from "@testing-library/react";

// React 19対応のカスタムレンダラー
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
      children
    );
  };

  // React 19のonCaughtErrorを使用して警告を抑制
  return render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
    onCaughtError: () => {},
  });
}
