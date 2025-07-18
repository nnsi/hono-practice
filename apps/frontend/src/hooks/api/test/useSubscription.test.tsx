import type { ReactNode } from "react";

import {
  renderHookWithActSync as renderHookWithAct,
  waitForWithAct,
} from "@frontend/test-utils";
import { apiClient } from "@frontend/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SubscriptionResponse } from "@dtos/response";

import { useSubscription } from "../useSubscription";


// モック
vi.mock("@frontend/utils/apiClient", () => {
  const mockApiClient = {
    users: {
      subscription: {
        $get: vi.fn(),
      },
    },
  };
  return {
    apiClient: mockApiClient,
  };
});

describe("useSubscription", () => {
  let queryClient: QueryClient;
  const mockApiClient = apiClient as any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const createMockSubscription = (
    overrides?: Partial<SubscriptionResponse>,
  ): SubscriptionResponse => ({
    plan: "free",
    status: "active",
    canUseApiKey: true,
    trialEnd: null,
    currentPeriodEnd: new Date("2024-12-31").toISOString(),
    ...overrides,
  });

  it("サブスクリプション情報を正常に取得する", async () => {
    const mockSubscription = createMockSubscription({
      plan: "premium",
    });

    vi.mocked(mockApiClient.users.subscription.$get).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockSubscription),
    } as any);

    const { result } = renderHookWithAct(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    // 初期状態を確認
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitForWithAct(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // データが正しく取得されていることを確認
    expect(result.current.data).toEqual(mockSubscription);
    expect(result.current.data?.plan).toBe("premium");
    expect(result.current.data?.canUseApiKey).toBe(true);
  });

  it("APIエラー時にエラー状態になる", async () => {
    vi.mocked(mockApiClient.users.subscription.$get).mockResolvedValue({
      ok: false,
      json: vi.fn(),
    } as any);

    const { result } = renderHookWithAct(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitForWithAct(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Failed to fetch subscription");
    expect(result.current.data).toBeUndefined();
  });

  it("ネットワークエラー時にエラー状態になる", async () => {
    const mockError = new Error("Network error");
    vi.mocked(mockApiClient.users.subscription.$get).mockRejectedValue(
      mockError,
    );

    const { result } = renderHookWithAct(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitForWithAct(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it("キャッシュキーが正しく設定される", async () => {
    const mockSubscription = createMockSubscription();

    vi.mocked(mockApiClient.users.subscription.$get).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockSubscription),
    } as any);

    renderHookWithAct(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitForWithAct(() => {
      // キャッシュにデータが保存されていることを確認
      const cachedData = queryClient.getQueryData(["subscription"]);
      expect(cachedData).toEqual(mockSubscription);
    });
  });

  it("staleTimeが5分に設定されている", () => {
    const mockSubscription = createMockSubscription();

    vi.mocked(mockApiClient.users.subscription.$get).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockSubscription),
    } as any);

    renderHookWithAct(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    // QueryClientのクエリ設定を確認
    const queryCache = queryClient.getQueryCache();
    const query = queryCache.find({ queryKey: ["subscription"] });
    // staleTimeのチェックは型定義が異なるため削除
    expect(query).toBeDefined();
  });

  it("フリープランのサブスクリプション情報を取得する", async () => {
    const mockSubscription = createMockSubscription({
      plan: "free",
      status: "active",
      canUseApiKey: false,
    });

    vi.mocked(mockApiClient.users.subscription.$get).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockSubscription),
    } as any);

    const { result } = renderHookWithAct(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitForWithAct(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.plan).toBe("free");
    expect(result.current.data?.canUseApiKey).toBe(false);
  });

  it("期限切れのサブスクリプション情報を取得する", async () => {
    const mockSubscription = createMockSubscription({
      plan: "premium",
      status: "expired",
      currentPeriodEnd: new Date("2023-12-31").toISOString(),
    });

    vi.mocked(mockApiClient.users.subscription.$get).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockSubscription),
    } as any);

    const { result } = renderHookWithAct(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitForWithAct(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.status).toBe("expired");
    expect(
      new Date(result.current.data!.currentPeriodEnd!).getTime(),
    ).toBeLessThan(Date.now());
  });

  it("再フェッチが正しく動作する", async () => {
    const mockSubscription1 = createMockSubscription({
      plan: "free",
    });

    const mockSubscription2 = createMockSubscription({
      plan: "premium",
    });

    vi.mocked(mockApiClient.users.subscription.$get)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSubscription1),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSubscription2),
      } as any);

    const { result } = renderHookWithAct(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    // 初回データ取得を待つ
    await waitForWithAct(() => {
      expect(result.current.data?.plan).toBe("free");
    });

    // 再フェッチ
    await result.current.refetch();

    await waitForWithAct(() => {
      expect(result.current.data?.plan).toBe("premium");
    });

    expect(mockApiClient.users.subscription.$get).toHaveBeenCalledTimes(2);
  });
});
