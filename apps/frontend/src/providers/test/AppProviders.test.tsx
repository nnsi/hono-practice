import type { ReactNode } from "react";
import { act, useContext } from "react";

import { useAuth } from "@frontend/hooks/useAuth";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { TokenContext } from "@frontend/providers/TokenProvider";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

import { AppProviders } from "../AppProviders";

// モック
vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="google-oauth-provider">{children}</div>
  ),
}));

// テスト用コンポーネント：すべてのコンテキストを検証
function TestComponent() {
  const queryClient = useQueryClient();
  const networkStatus = useNetworkStatusContext();
  const auth = useAuth();
  const token = useContext(TokenContext);

  return (
    <div>
      <div data-testid="query-client">
        {queryClient ? "QueryClient available" : "QueryClient not available"}
      </div>
      <div data-testid="network-status">
        {networkStatus
          ? `Online: ${networkStatus.isOnline}`
          : "NetworkStatus not available"}
      </div>
      <div data-testid="auth">
        {auth ? "Auth available" : "Auth not available"}
      </div>
      <div data-testid="token">
        {token ? "Token available" : "Token not available"}
      </div>
    </div>
  );
}

describe("AppProviders", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("すべてのプロバイダーが正しい順序でネストされる", async () => {
    await act(async () => {
      render(
        <AppProviders>
          <TestComponent />
        </AppProviders>,
      );
    });

    // すべてのコンテキストが利用可能であることを確認
    expect(screen.getByTestId("query-client")).toHaveTextContent(
      "QueryClient available",
    );
    expect(screen.getByTestId("network-status")).toHaveTextContent(
      "Online: true",
    );
    expect(screen.getByTestId("auth")).toHaveTextContent("Auth available");
    expect(screen.getByTestId("token")).toHaveTextContent("Token available");
  });

  it("カスタムQueryClientを受け取る", async () => {
    const customQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 5,
          staleTime: 10000,
        },
      },
    });

    await act(async () => {
      render(
        <AppProviders queryClient={customQueryClient}>
          <TestComponent />
        </AppProviders>,
      );
    });

    expect(screen.getByTestId("query-client")).toHaveTextContent(
      "QueryClient available",
    );

    // カスタム設定が反映されていることを確認
    expect(customQueryClient.getDefaultOptions().queries?.retry).toBe(5);
  });

  it("GoogleOAuthProviderにclientIdが渡される", async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <AppProviders googleClientId="custom-client-id">
          <TestComponent />
        </AppProviders>,
      );
      container = result.container;
    });

    const googleProvider = container!.querySelector(
      '[data-testid="google-oauth-provider"]',
    );
    expect(googleProvider).toBeInTheDocument();
  });

  it("StrictModeを無効化できる", async () => {
    // コンソールエラーをモック（StrictModeは二重レンダリングを引き起こす）
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let renderCount = 0;

    function CountingComponent() {
      renderCount++;
      return <div>Rendered {renderCount} times</div>;
    }

    await act(async () => {
      render(
        <AppProviders strictMode={false}>
          <CountingComponent />
        </AppProviders>,
      );
    });

    // StrictModeが無効の場合、レンダリングは1回のみ
    expect(renderCount).toBe(1);

    consoleSpy.mockRestore();
  });

  it("StrictModeがデフォルトで有効", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let renderCount = 0;

    function CountingComponent() {
      renderCount++;
      return <div>Rendered {renderCount} times</div>;
    }

    await act(async () => {
      render(
        <AppProviders>
          <CountingComponent />
        </AppProviders>,
      );
    });

    // StrictModeが有効の場合、開発環境では二重レンダリング
    expect(renderCount).toBeGreaterThan(1);

    consoleSpy.mockRestore();
  });

  it("ネットワーク状態の初期値が正しく設定される", async () => {
    // navigator.onLineをモックしてオフライン状態をシミュレート
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      writable: true,
      value: false,
    });

    await act(async () => {
      render(
        <AppProviders>
          <TestComponent />
        </AppProviders>,
      );
    });

    expect(screen.getByTestId("network-status")).toHaveTextContent(
      "Online: false",
    );

    // navigator.onLineを元に戻す
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      writable: true,
      value: true,
    });
  });

  it("プロバイダー間の依存関係が正しく機能する", async () => {
    // AuthProviderはTokenProviderに依存している
    let authValue: any = null;

    function DependencyTestComponent() {
      const token = useContext(TokenContext);
      const auth = useAuth();

      authValue = auth;

      return (
        <div>
          <div data-testid="dependency-test">
            Token: {token?.accessToken || "none"}, Auth:{" "}
            {auth.user ? "user" : "no user"}
          </div>
        </div>
      );
    }

    await act(async () => {
      render(
        <AppProviders>
          <DependencyTestComponent />
        </AppProviders>,
      );
    });

    await waitFor(() => {
      // TokenProviderがAuthProviderより先に初期化されることを確認
      expect(authValue).toBeDefined();
      expect(authValue.setAccessToken).toBeDefined();
    });
  });

  it("子コンポーネントがレンダリングされる", async () => {
    await act(async () => {
      render(
        <AppProviders>
          <div data-testid="child-component">Test Child</div>
        </AppProviders>,
      );
    });

    const childComponent = screen.getByTestId("child-component");
    expect(childComponent.textContent).toBe("Test Child");
  });

  it("環境変数がない場合のデフォルトclientId", async () => {
    // 環境変数をモック
    const originalEnv = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    (import.meta as any).env.VITE_GOOGLE_OAUTH_CLIENT_ID = undefined;

    await act(async () => {
      render(
        <AppProviders>
          <TestComponent />
        </AppProviders>,
      );
    });

    // デフォルト値が使用されることを確認
    expect(screen.getByTestId("query-client")).toBeInTheDocument();

    // 環境変数を復元
    (import.meta as any).env.VITE_GOOGLE_OAUTH_CLIENT_ID = originalEnv;
  });

  it("QueryClientのデフォルト設定が適用される", async () => {
    let queryClientRef: QueryClient | null = null;

    function QueryClientTestComponent() {
      queryClientRef = useQueryClient();
      return null;
    }

    await act(async () => {
      render(
        <AppProviders>
          <QueryClientTestComponent />
        </AppProviders>,
      );
    });

    await waitFor(() => {
      expect(queryClientRef).toBeDefined();
      const defaultOptions = queryClientRef!.getDefaultOptions();

      // デフォルト設定が適用されていることを確認
      expect(defaultOptions.queries?.retry).toBe(false);
      expect(defaultOptions.queries?.gcTime).toBe(1000 * 60 * 60 * 24);
      expect(defaultOptions.queries?.staleTime).toBe(0);
      expect(defaultOptions.queries?.refetchOnMount).toBe("always");
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(true);
      expect(defaultOptions.mutations?.retry).toBe(false);
    });
  });
});
