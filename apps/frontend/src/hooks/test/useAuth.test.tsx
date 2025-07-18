import type React from "react";

import { AuthContext } from "@frontend/providers/AuthProvider";
import {
  createMockAuthContext,
  createMockUserResponse,
  renderHookWithActSync as renderHookWithAct,
} from "@frontend/test-utils";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "../useAuth";

describe("useAuth", () => {
  it("AuthProviderの外で使用された場合にエラーをスローする", () => {
    // useAuthをAuthProviderの外で使用するとエラーがスローされることを確認
    expect(() => {
      renderHookWithAct(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");
  });

  it("AuthContextの値を正しく返す", () => {
    const mockUser = createMockUserResponse();
    const mockAuthContext = createMockAuthContext({ user: mockUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHookWithAct(() => useAuth(), { wrapper });

    expect(result.current).toBe(mockAuthContext);
    expect(result.current.user).toBe(mockUser);
  });

  it("ログイン関数が呼び出せる", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockAuthContext = createMockAuthContext({ login: mockLogin });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHookWithAct(() => useAuth(), { wrapper });

    await result.current.login({
      login_id: "test@example.com",
      password: "password",
    });

    expect(mockLogin).toHaveBeenCalledWith({
      login_id: "test@example.com",
      password: "password",
    });
  });

  it("ログアウト関数が呼び出せる", async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    const mockAuthContext = createMockAuthContext({ logout: mockLogout });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHookWithAct(() => useAuth(), { wrapper });

    await result.current.logout();

    expect(mockLogout).toHaveBeenCalled();
  });

  it("ユーザー情報取得関数が呼び出せる", async () => {
    const mockGetUser = vi.fn().mockResolvedValue(undefined);
    const mockAuthContext = createMockAuthContext({ getUser: mockGetUser });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHookWithAct(() => useAuth(), { wrapper });

    await result.current.getUser();

    expect(mockGetUser).toHaveBeenCalled();
  });

  it("リフレッシュトークン関数が呼び出せる", async () => {
    const mockRefreshToken = vi.fn().mockResolvedValue(undefined);
    const mockAuthContext = createMockAuthContext({
      refreshToken: mockRefreshToken,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHookWithAct(() => useAuth(), { wrapper });

    await result.current.refreshToken();

    expect(mockRefreshToken).toHaveBeenCalled();
  });

  it("リクエストステータスが正しく取得できる", () => {
    const mockAuthContext = createMockAuthContext({ requestStatus: "loading" });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHookWithAct(() => useAuth(), { wrapper });

    expect(result.current.requestStatus).toBe("loading");
  });

  it("初期化状態が正しく取得できる", () => {
    const mockAuthContext = createMockAuthContext({ isInitialized: true });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHookWithAct(() => useAuth(), { wrapper });

    expect(result.current.isInitialized).toBe(true);
  });
});
