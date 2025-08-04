import "@testing-library/jest-dom/vitest";
import React from "react";
import type { ReactNode } from "react";

import {
  createInMemoryEventBus,
  createMockTimeProvider,
} from "@frontend/services/abstractions";
import { createMockApiClient } from "@frontend/test-utils";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext, AuthProvider } from "../AuthProvider";
import { TokenContext, TokenProvider } from "../TokenProvider";

import type { EventBus } from "@frontend/services/abstractions";
import type { TokenStorage } from "@packages/frontend-shared/types";

// TestWrapper: TokenProviderとAuthProviderを統合
const TestWrapper = ({
  children,
  apiClient,
  eventBus,
  timeProvider,
  tokenStore,
}: {
  children: ReactNode;
  apiClient?: any;
  eventBus?: EventBus;
  timeProvider?: any;
  tokenStore?: any;
}) => {
  return (
    <TokenProvider
      tokenStore={tokenStore}
      timeProvider={timeProvider}
      eventBus={eventBus}
    >
      <AuthProvider apiClient={apiClient} eventBus={eventBus}>
        {children}
      </AuthProvider>
    </TokenProvider>
  );
};

describe("AuthProvider + TokenProvider 統合テスト", () => {
  let apiClient: ReturnType<typeof createMockApiClient>;
  let eventBus: EventBus;
  let timeProvider: ReturnType<typeof createMockTimeProvider>;
  let tokenStore: TokenStorage & {
    getToken: ReturnType<typeof vi.fn>;
    setToken: ReturnType<typeof vi.fn>;
    clearToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    apiClient = createMockApiClient();
    eventBus = createInMemoryEventBus();
    const baseTimeProvider = createMockTimeProvider(Date.now());

    // Wrap timeProvider methods with spies
    timeProvider = {
      ...baseTimeProvider,
      setTimeout: vi.fn(baseTimeProvider.setTimeout),
      clearTimeout: vi.fn(baseTimeProvider.clearTimeout),
      setInterval: vi.fn(baseTimeProvider.setInterval),
      clearInterval: vi.fn(baseTimeProvider.clearInterval),
    };

    // TokenStorageインターフェースに合わせたモック
    tokenStore = {
      getToken: vi.fn(() => null),
      setToken: vi.fn((token: string | null) => {
        tokenStore.getToken.mockReturnValue(token);
      }),
      clearToken: vi.fn(() => {
        tokenStore.getToken.mockReturnValue(null);
      }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初期化", () => {
    it("マウント時にトークンの取得を試みる", async () => {
      apiClient.auth.token.$post.mockResolvedValue({
        status: 401,
        json: async () => ({ message: "refresh token not found" }),
      });

      const TestComponent = () => {
        const auth = React.useContext(AuthContext);
        return <div>{auth?.isInitialized ? "initialized" : "loading"}</div>;
      };

      const { getByText } = render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <TestComponent />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(apiClient.auth.token.$post).toHaveBeenCalled();
        expect(getByText("initialized")).toBeInTheDocument();
      });
    });

    it("初期トークン取得に成功した場合、ユーザー情報を取得する", async () => {
      const mockToken = "initial-access-token";
      const mockUser = {
        id: "1",
        name: "test@example.com",
        providers: ["email"],
      };

      apiClient.auth.token.$post.mockResolvedValue({
        status: 200,
        json: async () => ({ token: mockToken }),
      });

      apiClient.user.me.$get.mockResolvedValue({
        status: 200,
        json: async () => mockUser,
      });

      const TestComponent = () => {
        const auth = React.useContext(AuthContext);
        return <div>{auth?.user ? `User: ${auth.user.name}` : "No user"}</div>;
      };

      const { getByText } = render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <TestComponent />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(tokenStore.setToken).toHaveBeenCalledWith(mockToken);
        expect(apiClient.user.me.$get).toHaveBeenCalled();
        expect(getByText("User: test@example.com")).toBeInTheDocument();
      });
    });
  });

  describe("ログインフロー", () => {
    it("ログインに成功した場合、トークンを保存しユーザー情報を取得する", async () => {
      const loginData = { login_id: "test@example.com", password: "password" };
      const mockToken = "new-access-token";
      const mockUser = {
        id: "1",
        name: "test@example.com",
        providers: ["email"],
      };

      apiClient.auth.login.$post.mockResolvedValue({
        status: 200,
        json: async () => ({ token: mockToken }),
      });

      apiClient.user.me.$get.mockResolvedValue({
        status: 200,
        json: async () => mockUser,
      });

      const TestComponent = () => {
        const auth = React.useContext(AuthContext);
        const [loginResult, setLoginResult] = React.useState("");

        const handleLogin = async () => {
          try {
            await auth?.login(loginData);
            setLoginResult("success");
          } catch (error) {
            setLoginResult("failed");
          }
        };

        return (
          <div>
            <button type="button" onClick={handleLogin}>
              Login
            </button>
            <div data-testid="login-result">{loginResult}</div>
            <div data-testid="user-email">{auth?.user?.name || "No user"}</div>
          </div>
        );
      };

      const { getByText, getByTestId } = render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <TestComponent />
        </TestWrapper>,
      );

      // 初期化を待つ
      await waitFor(() => {
        expect(apiClient.auth.token.$post).toHaveBeenCalled();
      });

      // ログインボタンをクリック
      await act(async () => {
        getByText("Login").click();
      });

      await waitFor(() => {
        expect(apiClient.auth.login.$post).toHaveBeenCalledWith({
          json: loginData,
        });
        expect(tokenStore.setToken).toHaveBeenCalledWith(mockToken);
        expect(apiClient.user.me.$get).toHaveBeenCalled();
        expect(getByTestId("login-result")).toHaveTextContent("success");
        expect(getByTestId("user-email")).toHaveTextContent("test@example.com");
      });
    });

    it("ログインに失敗した場合、エラーを返す", async () => {
      apiClient.auth.login.$post.mockResolvedValue({
        status: 401,
        json: async () => ({ message: "Invalid credentials" }),
      });

      const TestComponent = () => {
        const auth = React.useContext(AuthContext);
        const [error, setError] = React.useState("");

        const handleLogin = async () => {
          try {
            await auth?.login({
              login_id: "test@example.com",
              password: "wrong",
            });
          } catch (e) {
            setError("Login failed");
          }
        };

        return (
          <div>
            <button type="button" onClick={handleLogin}>
              Login
            </button>
            <div data-testid="error">{error}</div>
          </div>
        );
      };

      const { getByText, getByTestId } = render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <TestComponent />
        </TestWrapper>,
      );

      // 初期化を待つ
      await waitFor(() => {
        expect(apiClient.auth.token.$post).toHaveBeenCalled();
      });

      await act(async () => {
        getByText("Login").click();
      });

      await waitFor(() => {
        expect(getByTestId("error")).toHaveTextContent("Login failed");
      });
    });
  });

  describe("ログアウトフロー", () => {
    it("ログアウト時にトークンとユーザー情報をクリアする", async () => {
      // 初期状態でログイン済みに設定
      const mockUser = {
        id: "1",
        name: "test@example.com",
        providers: ["email"],
      };

      apiClient.auth.token.$post.mockResolvedValue({
        status: 200,
        json: async () => ({ token: "existing-token" }),
      });

      apiClient.user.me.$get.mockResolvedValue({
        status: 200,
        json: async () => mockUser,
      });

      apiClient.auth.logout.$post.mockResolvedValue({
        status: 200,
        json: async () => ({}),
      });

      const TestComponent = () => {
        const auth = React.useContext(AuthContext);

        return (
          <div>
            <button type="button" onClick={() => auth?.logout()}>
              Logout
            </button>
            <div data-testid="user">{auth?.user?.name || "No user"}</div>
          </div>
        );
      };

      const { getByText, getByTestId } = render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <TestComponent />
        </TestWrapper>,
      );

      // 初期化を待つ
      await waitFor(() => {
        expect(getByTestId("user")).toHaveTextContent("test@example.com");
      });

      // ログアウトボタンをクリック
      await act(async () => {
        getByText("Logout").click();
      });

      await waitFor(() => {
        expect(apiClient.auth.logout.$post).toHaveBeenCalled();
        expect(tokenStore.setToken).toHaveBeenCalledWith(null);
        expect(getByTestId("user")).toHaveTextContent("No user");
      });
    });

    it("ログアウトAPIが失敗してもローカル状態をクリアする", async () => {
      apiClient.auth.logout.$post.mockRejectedValue(new Error("Network error"));

      const TestComponent = () => {
        const auth = React.useContext(AuthContext);
        const tokenContext = React.useContext(TokenContext);

        return (
          <div>
            <button type="button" onClick={() => auth?.logout()}>
              Logout
            </button>
            <div data-testid="token">
              {tokenContext?.accessToken || "No token"}
            </div>
          </div>
        );
      };

      tokenStore.setToken("existing-token");

      const { getByText } = render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <TestComponent />
        </TestWrapper>,
      );

      await act(async () => {
        getByText("Logout").click();
      });

      await waitFor(() => {
        expect(tokenStore.setToken).toHaveBeenCalledWith(null);
      });
    });
  });

  describe("トークンリフレッシュ", () => {
    it("トークンリフレッシュの自動スケジューリング", async () => {
      const mockToken = "access-token";

      apiClient.auth.token.$post.mockResolvedValue({
        status: 200,
        json: async () => ({ token: mockToken }),
      });

      apiClient.user.me.$get.mockResolvedValue({
        status: 200,
        json: async () => ({
          id: "1",
          name: "test@example.com",
          providers: ["email"],
        }),
      });

      render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <div>Test</div>
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(timeProvider.setTimeout).toHaveBeenCalledWith(
          expect.any(Function),
          14 * 60 * 1000, // 14分
        );
      });
    });

    it("TOKEN_REFRESH_NEEDEDイベントでトークンをリフレッシュする", async () => {
      const newToken = "refreshed-token";

      // 初期トークンの設定
      apiClient.auth.token.$post
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ token: "initial-token" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ token: newToken }),
        });

      render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <div>Test</div>
        </TestWrapper>,
      );

      // 初期化を待つ
      await waitFor(() => {
        expect(apiClient.auth.token.$post).toHaveBeenCalledTimes(1);
      });

      // TOKEN_REFRESH_NEEDEDイベントを発火
      await act(async () => {
        eventBus.emit("token-refresh-needed");
      });

      await waitFor(() => {
        expect(apiClient.auth.token.$post).toHaveBeenCalledTimes(2);
        expect(tokenStore.setToken).toHaveBeenCalledWith(newToken);
      });
    });

    it("トークンリフレッシュが失敗した場合（無効なリフレッシュトークン）", async () => {
      // 初期化時のトークン取得
      apiClient.auth.token.$post
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ token: "initial-token" }),
        })
        .mockResolvedValueOnce({
          status: 401,
          json: async () => ({ message: "invalid refresh token" }),
        });

      apiClient.user.me.$get.mockResolvedValue({
        status: 200,
        json: async () => ({
          id: "1",
          name: "test@example.com",
          providers: ["email"],
        }),
      });

      const TestComponent = () => {
        const auth = React.useContext(AuthContext);
        return <div>{auth?.user?.name || "No user"}</div>;
      };

      const { getByText } = render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <TestComponent />
        </TestWrapper>,
      );

      // 初期化を待つ
      await waitFor(() => {
        expect(getByText("test@example.com")).toBeInTheDocument();
      });

      // リフレッシュを実行
      await act(async () => {
        eventBus.emit("token-refresh-needed");
      });

      await waitFor(() => {
        expect(tokenStore.setToken).toHaveBeenCalledWith(null);
        expect(getByText("No user")).toBeInTheDocument();
      });
    });
  });

  describe("イベント連携", () => {
    it("TOKEN_REFRESHEDイベントでトークンが更新される", async () => {
      const newToken = "event-refreshed-token";

      render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <div>Test</div>
        </TestWrapper>,
      );

      // TOKEN_REFRESHEDイベントを発火
      await act(async () => {
        eventBus.emit("token-refreshed", newToken);
      });

      await waitFor(() => {
        expect(tokenStore.setToken).toHaveBeenCalledWith(newToken);
        expect(timeProvider.setTimeout).toHaveBeenCalled();
      });
    });

    it("タイマーによる自動リフレッシュ", async () => {
      const initialToken = "initial-token";
      const refreshedToken = "refreshed-token";

      apiClient.auth.token.$post
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ token: initialToken }),
        })
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ token: refreshedToken }),
        });

      render(
        <TestWrapper
          apiClient={apiClient}
          eventBus={eventBus}
          timeProvider={timeProvider}
          tokenStore={tokenStore}
        >
          <div>Test</div>
        </TestWrapper>,
      );

      // 初期化を待つ
      await waitFor(() => {
        expect(tokenStore.setToken).toHaveBeenCalledWith(initialToken);
      });

      // 14分経過をシミュレート
      act(() => {
        timeProvider.advance(14 * 60 * 1000);
      });

      await waitFor(() => {
        expect(apiClient.auth.token.$post).toHaveBeenCalledTimes(2);
        expect(tokenStore.setToken).toHaveBeenCalledWith(refreshedToken);
      });
    });
  });

  describe("エラーケース", () => {
    it("TokenProviderなしでAuthProviderを使用するとエラーになる", () => {
      // コンソールエラーを無視
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(
          <AuthProvider>
            <div>Test</div>
          </AuthProvider>,
        );
      }).toThrow("AuthProvider must be used within TokenProvider");

      console.error = originalError;
    });
  });
});
