import * as useAuthHook from "@frontend/hooks/useAuth";
import * as routerHooks from "@tanstack/react-router";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LoginRequest } from "@dtos/request/LoginRequest";

import * as useToastHook from "@components/ui";

import { useLogin } from "../useLogin";

// モックの設定
vi.mock("@frontend/hooks/useAuth");
vi.mock("@components/ui");
vi.mock("@tanstack/react-router");
vi.mock("@frontend/utils/apiClient", () => ({
  apiClient: {
    auth: {
      google: {
        $post: vi.fn(),
      },
    },
  },
}));

describe("useLogin", () => {
  const mockLogin = vi.fn();
  const mockSetUser = vi.fn();
  const mockSetAccessToken = vi.fn();
  const mockScheduleTokenRefresh = vi.fn();
  const mockToast = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // useAuthのモック
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      login: mockLogin,
      setUser: mockSetUser,
      setAccessToken: mockSetAccessToken,
      scheduleTokenRefresh: mockScheduleTokenRefresh,
    } as any);

    // useToastのモック
    vi.mocked(useToastHook.useToast).mockReturnValue({
      toast: mockToast,
    } as any);

    // useNavigateのモック
    vi.mocked(routerHooks.useNavigate).mockReturnValue(mockNavigate);
  });

  it("フォームが初期化される", () => {
    const { result } = renderHook(() => useLogin());

    expect(result.current.form.getValues()).toEqual({
      login_id: "",
      password: "",
    });
  });

  it("ログイン成功時にホームページにリダイレクトする", async () => {
    mockLogin.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogin());

    const loginData: LoginRequest = {
      login_id: "test@example.com",
      password: "password123",
    };

    await act(async () => {
      await result.current.handleLogin(loginData);
    });

    expect(mockLogin).toHaveBeenCalledWith(loginData);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("ログイン失敗時にエラートーストを表示する", async () => {
    mockLogin.mockRejectedValue(new Error("Login failed"));

    const { result } = renderHook(() => useLogin());

    const loginData: LoginRequest = {
      login_id: "test@example.com",
      password: "wrong-password",
    };

    await act(async () => {
      await result.current.handleLogin(loginData);
    });

    expect(mockLogin).toHaveBeenCalledWith(loginData);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      description: "ログインIDまたはパスワードが間違っています",
      variant: "destructive",
    });
  });

  it("Google認証成功時に正しく処理される", async () => {
    const mockGoogleResponse = {
      credential: "mock-google-credential",
    };

    const mockApiResponse = {
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Google User",
        providers: ["google"],
      },
      token: "mock-access-token",
    };

    const { apiClient } = await import("@frontend/utils/apiClient");
    vi.mocked(apiClient.auth.google.$post).mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue(mockApiResponse),
    } as any);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleGoogleSuccess(mockGoogleResponse);
    });

    expect(apiClient.auth.google.$post).toHaveBeenCalledWith({
      json: { credential: "mock-google-credential" },
    });
    expect(mockSetAccessToken).toHaveBeenCalledWith("mock-access-token");
    expect(mockScheduleTokenRefresh).toHaveBeenCalled();
    expect(mockSetUser).toHaveBeenCalledWith({
      ...mockApiResponse.user,
      name: "Google User",
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("Google認証でcredentialがない場合はエラートーストを表示する", async () => {
    const mockGoogleResponse = {
      credential: null,
    };

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleGoogleSuccess(mockGoogleResponse);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "エラー",
      description: "Google認証に失敗しました",
      variant: "destructive",
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("Google認証でAPIが200以外のステータスを返した場合はエラートーストを表示する", async () => {
    const mockGoogleResponse = {
      credential: "mock-google-credential",
    };

    const { apiClient } = await import("@frontend/utils/apiClient");
    vi.mocked(apiClient.auth.google.$post).mockResolvedValue({
      status: 401,
      json: vi.fn().mockResolvedValue({ error: "Unauthorized" }),
    } as any);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleGoogleSuccess(mockGoogleResponse);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "エラー",
      description: "Google認証に失敗しました",
      variant: "destructive",
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("Google認証でAPI呼び出しが例外をスローした場合はエラートーストを表示する", async () => {
    const mockGoogleResponse = {
      credential: "mock-google-credential",
    };

    const { apiClient } = await import("@frontend/utils/apiClient");
    vi.mocked(apiClient.auth.google.$post).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleGoogleSuccess(mockGoogleResponse);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "エラー",
      description: "Google認証に失敗しました",
      variant: "destructive",
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handleGoogleErrorがエラートーストを表示する", () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleGoogleError();
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "エラー",
      description: "Google認証に失敗しました",
      variant: "destructive",
    });
  });

  // Note: フォームバリデーションのテストは react-hook-form の内部実装に依存するため、
  // 実際のフォームコンポーネントでのテストが推奨される

  it("フォームの値を更新できる", () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.form.setValue("login_id", "new@example.com");
      result.current.form.setValue("password", "newpassword");
    });

    expect(result.current.form.getValues()).toEqual({
      login_id: "new@example.com",
      password: "newpassword",
    });
  });

  it("Google認証でユーザー名がnullの場合も正しく処理される", async () => {
    const mockGoogleResponse = {
      credential: "mock-google-credential",
    };

    const mockApiResponse = {
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        name: null,
        providers: ["google"],
      },
      token: "mock-access-token",
    };

    const { apiClient } = await import("@frontend/utils/apiClient");
    vi.mocked(apiClient.auth.google.$post).mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue(mockApiResponse),
    } as any);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleGoogleSuccess(mockGoogleResponse);
    });

    expect(mockSetUser).toHaveBeenCalledWith({
      ...mockApiResponse.user,
      name: null,
    });
  });
});
