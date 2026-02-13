import type {
  NavigationAdapter,
  NotificationAdapter,
} from "@packages/frontend-shared/adapters";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserInfo } from "./useUserSettings";
import { createUseUserSettings } from "./useUserSettings";

describe("createUseUserSettings", () => {
  let mockNavigation: NavigationAdapter;
  let mockNotification: NotificationAdapter;
  let mockAuth: any;
  let mockApi: any;

  const mockUser: UserInfo = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    providers: ["email"],
    providerEmails: {},
  };

  const mockUserWithGoogle: UserInfo = {
    ...mockUser,
    providers: ["email", "google"],
    providerEmails: {
      google: "test@gmail.com",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

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
      user: mockUser,
      logout: vi.fn().mockResolvedValue(undefined),
      getUser: vi.fn().mockResolvedValue(undefined),
    };

    mockApi = {
      linkGoogleAccount: vi.fn().mockResolvedValue(undefined),
      invalidateUserCache: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("should return user info and Google link status", () => {
    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    expect(result.current.stateProps.user).toEqual(mockUser);
    expect(result.current.stateProps.isGoogleLinked).toBe(false);
    expect(result.current.stateProps.googleEmail).toBeUndefined();
  });

  it("should detect Google linked account", () => {
    mockAuth.user = mockUserWithGoogle;

    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    expect(result.current.stateProps.isGoogleLinked).toBe(true);
    expect(result.current.stateProps.googleEmail).toBe("test@gmail.com");
  });

  it("should handle successful logout", async () => {
    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    await act(async () => {
      await result.current.actions.onLogout();
    });

    expect(mockAuth.logout).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith("/");
    expect(mockNotification.toast).not.toHaveBeenCalled();
  });

  it("should handle logout error", async () => {
    mockAuth.logout.mockRejectedValue(new Error("Logout failed"));

    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    await act(async () => {
      await result.current.actions.onLogout();
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "エラー",
      description: "ログアウトに失敗しました",
      variant: "destructive",
    });
  });

  it("should handle successful Google account linking", async () => {
    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    const credentialResponse = { credential: "google-credential" };

    await act(async () => {
      await result.current.actions.onGoogleLink(credentialResponse);
    });

    expect(mockApi.linkGoogleAccount).toHaveBeenCalledWith("google-credential");
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "Success",
      description: "Successfully linked Google account",
      variant: "default",
    });
    expect(mockAuth.getUser).toHaveBeenCalled();
    expect(mockApi.invalidateUserCache).toHaveBeenCalled();
  });

  it("should handle Google link without credential", async () => {
    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    const credentialResponse = {};

    await act(async () => {
      await result.current.actions.onGoogleLink(credentialResponse);
    });

    expect(mockApi.linkGoogleAccount).not.toHaveBeenCalled();
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Failed to link Google account",
      variant: "destructive",
    });
  });

  it("should handle Google link error", async () => {
    mockApi.linkGoogleAccount.mockRejectedValue(new Error("Link failed"));

    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    const credentialResponse = { credential: "google-credential" };

    await act(async () => {
      await result.current.actions.onGoogleLink(credentialResponse);
    });

    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Failed to link Google account",
      variant: "destructive",
    });
    expect(mockAuth.getUser).not.toHaveBeenCalled();
  });

  it("should handle Google link error callback", () => {
    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    act(() => {
      result.current.actions.onGoogleLinkError();
    });

    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Failed to link Google account",
      variant: "destructive",
    });
  });

  it("should handle account deletion with confirmation", async () => {
    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    await act(async () => {
      await result.current.actions.onDeleteAccount();
    });

    expect(mockNotification.confirm).toHaveBeenCalledWith(
      "アカウント削除",
      "本当にアカウントを削除しますか？この操作は取り消せません。",
    );
    expect(mockAuth.logout).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith("/");
    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "アカウントを削除しました",
      variant: "default",
    });
  });

  it("should cancel account deletion when not confirmed", async () => {
    (mockNotification.confirm as any).mockResolvedValue(false);

    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    await act(async () => {
      await result.current.actions.onDeleteAccount();
    });

    expect(mockAuth.logout).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it("should work without invalidateUserCache", async () => {
    const apiWithoutInvalidate = {
      linkGoogleAccount: vi.fn().mockResolvedValue(undefined),
    };

    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: apiWithoutInvalidate,
      }),
    );

    const credentialResponse = { credential: "google-credential" };

    await act(async () => {
      await result.current.actions.onGoogleLink(credentialResponse);
    });

    expect(apiWithoutInvalidate.linkGoogleAccount).toHaveBeenCalled();
    expect(mockAuth.getUser).toHaveBeenCalled();
  });

  it("should handle mobile Google link error", async () => {
    const { result } = renderHook(() =>
      createUseUserSettings({
        navigation: mockNavigation,
        notification: mockNotification,
        auth: mockAuth,
        api: mockApi,
      }),
    );

    await act(async () => {
      try {
        await result.current.actions.onMobileGoogleLink();
      } catch (_error) {
        // Expected to fail
      }
    });

    expect(mockNotification.toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Failed to link Google account",
      variant: "destructive",
    });
  });
});
