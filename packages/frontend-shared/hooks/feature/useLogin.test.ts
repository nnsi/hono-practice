import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createLoginValidation, createUseLogin } from "./useLogin";

import type {
  FormAdapter,
  NavigationAdapter,
  NotificationAdapter,
} from "@packages/frontend-shared/adapters";
import type { LoginRequest } from "@packages/types";

describe("createUseLogin", () => {
  let mockForm: FormAdapter<LoginRequest>;
  let mockNavigation: NavigationAdapter;
  let mockNotification: NotificationAdapter;
  let mockAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockForm = {
      register: vi.fn().mockReturnValue({
        value: "",
        onChange: vi.fn(),
        onBlur: vi.fn(),
        error: undefined,
      }),
      getValue: vi.fn(),
      setValue: vi.fn(),
      getValues: vi.fn().mockReturnValue({ login_id: "", password: "" }),
      setValues: vi.fn(),
      getFieldMeta: vi
        .fn()
        .mockReturnValue({ touched: false, error: undefined }),
      handleSubmit: vi.fn(
        (onSubmit) => () =>
          onSubmit({ login_id: "test", password: "password" }),
      ),
      reset: vi.fn(),
      clearErrors: vi.fn(),
      setError: vi.fn(),
      watch: vi.fn(),
      formState: {
        errors: { login_id: undefined, password: undefined },
        isDirty: false,
        isValid: true,
        isSubmitting: false,
        touchedFields: { login_id: false, password: false },
      },
    };

    mockNavigation = {
      navigate: vi.fn(),
      replace: vi.fn(),
      goBack: vi.fn(),
    };

    mockNotification = {
      toast: vi.fn(),
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
    };

    mockAuth = {
      login: vi.fn().mockResolvedValue(undefined),
      googleLogin: vi.fn().mockResolvedValue({
        user: { id: "1", name: "Test User", email: "test@example.com" },
        token: "test-token",
      }),
      setUser: vi.fn(),
      setAccessToken: vi.fn(),
      scheduleTokenRefresh: vi.fn(),
    };
  });

  it("should handle successful login", async () => {
    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(mockAuth.login).toHaveBeenCalledWith({
      login_id: "test",
      password: "password",
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith("/");
    expect(mockNotification.toast).not.toHaveBeenCalled();
  });

  it("should handle login error", async () => {
    mockAuth.login.mockRejectedValue(new Error("Invalid credentials"));

    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "ログインエラー",
      description: "ログインIDまたはパスワードが間違っています",
      variant: "destructive",
    });
  });

  it("should handle successful Google login", async () => {
    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    const credentialResponse = { credential: "google-credential-token" };

    await act(async () => {
      await result.current.handleGoogleSuccess(credentialResponse);
    });

    expect(mockAuth.googleLogin).toHaveBeenCalledWith(
      "google-credential-token",
    );
    expect(mockAuth.setAccessToken).toHaveBeenCalledWith("test-token");
    expect(mockAuth.scheduleTokenRefresh).toHaveBeenCalled();
    expect(mockAuth.setUser).toHaveBeenCalledWith({
      id: "1",
      name: "Test User",
      email: "test@example.com",
    });

    // Wait for setTimeout
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/");
  });

  it("should handle Google login without credential", async () => {
    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    const credentialResponse = {};

    await act(async () => {
      await result.current.handleGoogleSuccess(credentialResponse);
    });

    expect(mockAuth.googleLogin).not.toHaveBeenCalled();
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "エラー",
      description: "Google認証に失敗しました",
      variant: "destructive",
    });
  });

  it("should handle Google login error", async () => {
    mockAuth.googleLogin.mockRejectedValue(new Error("Google auth failed"));

    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    const credentialResponse = { credential: "google-credential-token" };

    await act(async () => {
      await result.current.handleGoogleSuccess(credentialResponse);
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "エラー",
      description: "Google認証に失敗しました",
      variant: "destructive",
    });
  });

  it("should handle Google error callback", () => {
    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    act(() => {
      result.current.handleGoogleError();
    });

    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "エラー",
      description: "Google認証に失敗しました",
      variant: "destructive",
    });
  });

  it("should handle null user name in Google login", async () => {
    mockAuth.googleLogin.mockResolvedValue({
      user: { id: "1", name: null, email: "test@example.com" },
      token: "test-token",
    });

    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    const credentialResponse = { credential: "google-credential-token" };

    await act(async () => {
      await result.current.handleGoogleSuccess(credentialResponse);
    });

    expect(mockAuth.setUser).toHaveBeenCalledWith({
      id: "1",
      name: null,
      email: "test@example.com",
    });
  });

  it("should throw error for unimplemented mobile Google login", async () => {
    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    await act(async () => {
      try {
        await result.current.handleMobileGoogleLogin();
      } catch (error) {
        // Expected to fail
      }
    });

    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "エラー",
      description: "Google認証に失敗しました",
      variant: "destructive",
    });
  });

  it("should provide form instance", () => {
    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    expect(result.current.form).toBe(mockForm);
  });

  it("should provide isSubmitting state", () => {
    const { result } = renderHook(() =>
      createUseLogin({
        form: mockForm,
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
      }),
    );

    expect(result.current.isSubmitting).toBe(false);
  });
});

describe("createLoginValidation", () => {
  it("should return validation rules", () => {
    const validation = createLoginValidation();

    expect(validation.login_id).toEqual({
      required: "ログインIDを入力してください",
      minLength: {
        value: 3,
        message: "ログインIDは3文字以上で入力してください",
      },
    });

    expect(validation.password).toEqual({
      required: "パスワードを入力してください",
      minLength: {
        value: 8,
        message: "パスワードは8文字以上で入力してください",
      },
    });
  });
});
