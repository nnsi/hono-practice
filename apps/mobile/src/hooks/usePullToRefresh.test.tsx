// @vitest-environment jsdom
import type { ReactNode } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./useNavigationSync", () => ({
  getNavigationSync: vi.fn(),
  useNavigationSync: vi.fn(),
}));

import { AuthContext, type AuthContextType } from "../contexts/AuthContext";
import { usePullToRefresh } from "./usePullToRefresh";

function setup(auth: Partial<AuthContextType>) {
  let resolveRun!: () => void;
  const run = vi.fn(
    () =>
      new Promise<{ pulled: boolean }>((r) => {
        resolveRun = () => r({ pulled: true });
      }),
  );
  const getNavigationSync = vi.fn(() => ({
    run,
    trigger: vi.fn(),
    cancel: vi.fn(),
  }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider
      value={
        {
          isLoggedIn: true,
          isLoading: false,
          syncReady: true,
          userId: "u1",
          ...auth,
        } as AuthContextType
      }
    >
      {children}
    </AuthContext.Provider>
  );
  const hook = renderHook(() => usePullToRefresh({ getNavigationSync }), {
    wrapper,
  });
  return { hook, run, getNavigationSync, resolveRun: () => resolveRun() };
}

describe("usePullToRefresh", () => {
  it("shows the loader until the full sync resolves", async () => {
    const s = setup({});
    expect(s.hook.result.current.refreshing).toBe(false);

    let refresh!: Promise<void>;
    act(() => {
      refresh = s.hook.result.current.onRefresh();
    });
    expect(s.hook.result.current.refreshing).toBe(true);
    expect(s.getNavigationSync).toHaveBeenCalledWith("u1");

    await act(async () => {
      s.resolveRun();
      await refresh;
    });
    expect(s.hook.result.current.refreshing).toBe(false);
  });

  it("is a no-op before sync is ready or without a userId", async () => {
    for (const auth of [{ syncReady: false }, { userId: null }]) {
      const s = setup(auth);
      await act(async () => {
        await s.hook.result.current.onRefresh();
      });
      expect(s.run).not.toHaveBeenCalled();
      expect(s.hook.result.current.refreshing).toBe(false);
    }
  });
});
