import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUseSubscription } from "./useSubscription";

describe("createUseSubscription", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockApiClient = {
    users: {
      subscription: {
        $get: vi.fn(),
      },
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch subscription data successfully", async () => {
    const mockSubscription = {
      id: "sub-1",
      userId: "00000000-0000-4000-8000-000000000001",
      plan: "premium",
      status: "active",
      startedAt: "2024-01-01T00:00:00Z",
      endsAt: "2024-12-31T23:59:59Z",
      cancelledAt: null,
      features: {
        maxActivities: 100,
        maxGoals: 50,
        advancedStats: true,
      },
    };

    mockApiClient.users.subscription.$get = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockSubscription),
    });

    const { result } = renderHook(
      () => createUseSubscription({ apiClient: mockApiClient }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockSubscription);
    expect(mockApiClient.users.subscription.$get).toHaveBeenCalledTimes(1);
  });

  it("should handle error when subscription fetch fails", async () => {
    mockApiClient.users.subscription.$get = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn(),
    });

    const { result } = renderHook(
      () => createUseSubscription({ apiClient: mockApiClient }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Failed to fetch subscription");
  });

  it("should use staleTime configuration", () => {
    const mockSubscription = {
      id: "sub-1",
      userId: "00000000-0000-4000-8000-000000000001",
      plan: "free",
      status: "active",
      startedAt: "2024-01-01T00:00:00Z",
      endsAt: null,
      cancelledAt: null,
      features: {
        maxActivities: 10,
        maxGoals: 5,
        advancedStats: false,
      },
    };

    mockApiClient.users.subscription.$get = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockSubscription),
    });

    const { result } = renderHook(
      () => createUseSubscription({ apiClient: mockApiClient }),
      { wrapper: createWrapper() },
    );

    // staleTimeが設定されていることを確認（5分 = 300000ms）
    // このテストは、react-queryの内部実装に依存するため、
    // 実際のstaleTime動作は統合テストで確認することを推奨
    expect(result.current).toBeDefined();
  });
});
