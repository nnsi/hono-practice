import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchSubscription: vi.fn(),
}));

vi.mock("../../hooks/useSubscription", () => ({
  fetchSubscription: mocks.fetchSubscription,
  subscriptionQueryOptions: () => ({
    queryKey: ["subscription"],
    queryFn: mocks.fetchSubscription,
    staleTime: 1000 * 60 * 5,
  }),
}));

import {
  pollForCheckoutEntitlement,
  useCheckoutReconciliation,
} from "./useCheckoutReconciliation";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe("pollForCheckoutEntitlement", () => {
  it("keeps polling through stale values and transient errors", async () => {
    const fetchPlan = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("free")
      .mockResolvedValueOnce("premium");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      pollForCheckoutEntitlement(fetchPlan, {
        maxAttempts: 4,
        initialDelayMs: 10,
        sleep,
      }),
    ).resolves.toBe(true);
    expect(fetchPlan).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
  });

  it("stops at the configured boundary", async () => {
    const fetchPlan = vi.fn().mockResolvedValue("free");

    await expect(
      pollForCheckoutEntitlement(fetchPlan, {
        maxAttempts: 2,
        sleep: vi.fn().mockResolvedValue(undefined),
      }),
    ).resolves.toBe(false);
    expect(fetchPlan).toHaveBeenCalledTimes(2);
  });
});

describe("useCheckoutReconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/settings");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("stays idle without a checkout success marker", async () => {
    const queryClient = newQueryClient();
    const { result } = renderHook(() => useCheckoutReconciliation(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current).toBe("idle");
    expect(mocks.fetchSubscription).not.toHaveBeenCalled();
  });

  it("consumes only the marker, preserves query/hash, and completes through Query", async () => {
    window.history.replaceState(
      {},
      "",
      "/settings?checkout=success&source=account#billing",
    );
    mocks.fetchSubscription
      .mockResolvedValueOnce({ plan: "free" })
      .mockResolvedValueOnce({ plan: "premium" });
    const queryClient = newQueryClient();
    const { result } = renderHook(
      () =>
        useCheckoutReconciliation({
          maxAttempts: 3,
          initialDelayMs: 1,
          sleep: vi.fn().mockResolvedValue(undefined),
        }),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current).toBe("polling");
    await waitFor(() => expect(result.current).toBe("complete"));
    expect(window.location.pathname).toBe("/settings");
    expect(window.location.search).toBe("?source=account");
    expect(window.location.hash).toBe("#billing");
    expect(mocks.fetchSubscription).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(["subscription"])).toEqual({
      plan: "premium",
    });
  });

  it("reports timeout after transient errors exhaust the bounded retry", async () => {
    window.history.replaceState({}, "", "/settings?checkout=success");
    mocks.fetchSubscription
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ plan: "free" });
    const queryClient = newQueryClient();
    const { result } = renderHook(
      () =>
        useCheckoutReconciliation({
          maxAttempts: 2,
          initialDelayMs: 1,
          sleep: vi.fn().mockResolvedValue(undefined),
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current).toBe("timeout"));
    expect(mocks.fetchSubscription).toHaveBeenCalledTimes(2);
  });

  it("aborts polling on unmount without starting another request", async () => {
    window.history.replaceState({}, "", "/settings?checkout=success");
    mocks.fetchSubscription.mockResolvedValue({ plan: "free" });
    let observedSignal: AbortSignal | undefined;
    const sleep = vi.fn(
      (_milliseconds: number, signal?: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          observedSignal = signal;
          signal?.addEventListener(
            "abort",
            () => reject(new Error("cancelled")),
            { once: true },
          );
        }),
    );
    const queryClient = newQueryClient();
    const { unmount } = renderHook(
      () => useCheckoutReconciliation({ maxAttempts: 3, sleep }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(sleep).toHaveBeenCalledOnce());
    unmount();

    expect(observedSignal?.aborted).toBe(true);
    expect(mocks.fetchSubscription).toHaveBeenCalledOnce();
  });
});
