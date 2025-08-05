import type React from "react";

import * as useAuthHook from "@frontend/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const mockCreateUserApi = vi.fn();
const mockGoogleAuth = vi.fn();

vi.mock("@frontend/hooks/api", () => ({
  useCreateUserApi: () => ({
    mutateAsync: mockCreateUserApi,
  }),
  useGoogleAuth: () => ({
    mutateAsync: mockGoogleAuth,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

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
    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.form.getValues()).toEqual({
      name: "",
      loginId: "",
      password: "",
    });
  });

  it("ユーザー作成成功時にホームページにリダイレクトする", async () => {
    const mockToken = "mock-access-token";
    mockCreateUserApi.mockResolvedValue({ token: mockToken });
    mockGetUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    const userData: CreateUserRequest = {
      name: "Test User",
      loginId: "testuser",
      password: "password123",
    };

    await act(async () => {
      await result.current.onSubmit(userData);
    });

    expect(mockCreateUserApi).toHaveBeenCalledWith(userData);
    expect(mockSetAccessToken).toHaveBeenCalledWith(mockToken);
    expect(mockScheduleTokenRefresh).toHaveBeenCalled();
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("ユーザー作成失敗時にエラートーストを表示する", async () => {
    mockCreateUserApi.mockRejectedValue(new Error("User creation failed"));

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    const userData: CreateUserRequest = {
      name: "Test User",
      loginId: "testuser",
      password: "password123",
    };

    await act(async () => {
      await result.current.onSubmit(userData);
    });

    expect(mockCreateUserApi).toHaveBeenCalledWith(userData);
    expect(mockSetAccessToken).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: "エラー",
      description: "ユーザー作成に失敗しました",
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

    mockGoogleAuth.mockResolvedValue(mockApiResponse);

    mockGetUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleGoogleSuccess(mockGoogleResponse);
    });

    expect(mockGoogleAuth).toHaveBeenCalledWith("mock-google-credential");
    expect(mockSetAccessToken).toHaveBeenCalledWith("mock-access-token");
    expect(mockScheduleTokenRefresh).toHaveBeenCalled();
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("Google認証でcredentialがない場合はエラートーストを表示する", async () => {
    const mockGoogleResponse = {
      credential: null,
    };

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

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

    mockGoogleAuth.mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

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

    mockGoogleAuth.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

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
    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

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
    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

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
    mockCreateUserApi.mockResolvedValue({ token: mockToken });
    mockGetUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    });

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
