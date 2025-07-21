import * as useAuthHook from "@frontend/hooks/useAuth";
import * as routerHooks from "@tanstack/react-router";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateUserRequest } from "@dtos/request/CreateUserRequest";

import * as useToastHook from "@components/ui";

import { useCreateUser } from "../useCreateUser";

// モックの設定
vi.mock("@frontend/hooks/useAuth");
vi.mock("@components/ui");
vi.mock("@tanstack/react-router");
vi.mock("@frontend/utils/apiClient", () => ({
  apiClient: {
    user: {
      $post: vi.fn(),
    },
    auth: {
      google: {
        $post: vi.fn(),
      },
    },
  },
}));

describe("useCreateUser", () => {
  const mockGetUser = vi.fn();
  const mockSetAccessToken = vi.fn();
  const mockScheduleTokenRefresh = vi.fn();
  const mockToast = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // useAuthのモック
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      getUser: mockGetUser,
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
    const { result } = renderHook(() => useCreateUser());

    expect(result.current.form.getValues()).toEqual({
      name: "",
      loginId: "",
      password: "",
    });
  });

  it("ユーザー作成成功時にホームページにリダイレクトする", async () => {
    const mockToken = "mock-access-token";
    const { apiClient } = await import("@frontend/utils/apiClient");

    vi.mocked(apiClient.user.$post).mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ token: mockToken }),
    } as any);

    mockGetUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCreateUser());

    const userData: CreateUserRequest = {
      name: "Test User",
      loginId: "testuser",
      password: "password123",
    };

    await act(async () => {
      await result.current.onSubmit(userData);
    });

    expect(apiClient.user.$post).toHaveBeenCalledWith({ json: userData });
    expect(mockSetAccessToken).toHaveBeenCalledWith(mockToken);
    expect(mockScheduleTokenRefresh).toHaveBeenCalled();
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("ユーザー作成失敗時にエラートーストを表示する", async () => {
    const { apiClient } = await import("@frontend/utils/apiClient");

    vi.mocked(apiClient.user.$post).mockRejectedValue(
      new Error("User creation failed"),
    );

    const { result } = renderHook(() => useCreateUser());

    const userData: CreateUserRequest = {
      name: "Test User",
      loginId: "testuser",
      password: "password123",
    };

    await act(async () => {
      await result.current.onSubmit(userData);
    });

    expect(apiClient.user.$post).toHaveBeenCalledWith({ json: userData });
    expect(mockSetAccessToken).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: "エラー",
      description: "ユーザー作成に失敗しました",
      variant: "destructive",
    });
  });

  it("APIが200以外のステータスを返した場合は処理しない", async () => {
    const { apiClient } = await import("@frontend/utils/apiClient");

    vi.mocked(apiClient.user.$post).mockResolvedValue({
      status: 400,
      json: vi.fn().mockResolvedValue({ error: "Bad request" }),
    } as any);

    const { result } = renderHook(() => useCreateUser());

    const userData: CreateUserRequest = {
      name: "Test User",
      loginId: "testuser",
      password: "password123",
    };

    await act(async () => {
      await result.current.onSubmit(userData);
    });

    expect(mockSetAccessToken).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    // Note: 200以外のステータスコードの場合、現在の実装ではトーストは表示されない
  });

  it("Google認証成功時に正しく処理される", async () => {
    const mockGoogleResponse = {
      credential: "mock-google-credential",
    };

    const mockApiResponse = {
      token: "mock-access-token",
    };

    const { apiClient } = await import("@frontend/utils/apiClient");
    vi.mocked(apiClient.auth.google.$post).mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue(mockApiResponse),
    } as any);

    mockGetUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCreateUser());

    await act(async () => {
      await result.current.handleGoogleSuccess(mockGoogleResponse);
    });

    expect(apiClient.auth.google.$post).toHaveBeenCalledWith({
      json: { credential: "mock-google-credential" },
    });
    expect(mockSetAccessToken).toHaveBeenCalledWith("mock-access-token");
    expect(mockScheduleTokenRefresh).toHaveBeenCalled();
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("Google認証でcredentialがない場合はエラートーストを表示する", async () => {
    const mockGoogleResponse = {
      credential: null,
    };

    const { result } = renderHook(() => useCreateUser());

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

    const { result } = renderHook(() => useCreateUser());

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

    const { result } = renderHook(() => useCreateUser());

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
    const { result } = renderHook(() => useCreateUser());

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
    const { result } = renderHook(() => useCreateUser());

    act(() => {
      result.current.form.setValue("name", "New User");
      result.current.form.setValue("loginId", "newuser");
      result.current.form.setValue("password", "newpassword");
    });

    expect(result.current.form.getValues()).toEqual({
      name: "New User",
      loginId: "newuser",
      password: "newpassword",
    });
  });

  it("getUser呼び出し後にナビゲートする", async () => {
    const mockToken = "mock-access-token";
    const { apiClient } = await import("@frontend/utils/apiClient");

    vi.mocked(apiClient.user.$post).mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ token: mockToken }),
    } as any);

    mockGetUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCreateUser());

    const userData: CreateUserRequest = {
      name: "Test User",
      loginId: "testuser",
      password: "password123",
    };

    await act(async () => {
      await result.current.onSubmit(userData);
    });

    // onSubmitの処理が完了した時点で全ての処理が完了している
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });
});
