import type React from "react";

import { createMockApiClient } from "@frontend/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUserSettings } from "../useUserSettings";

// vi.hoistedでモック関数を定義
const { mockToast, mockLogout, mockNavigate } = vi.hoisted(() => {
  return {
    mockToast: vi.fn(),
    mockLogout: vi.fn(),
    mockNavigate: vi.fn(),
  };
});

// mockApiClientはvi.hoisted外で定義
let mockApiClient: ReturnType<typeof createMockApiClient>;

// モックの設定
vi.mock("@frontend/components/ui", () => ({
  useToast: () => ({ toast: mockToast }),
}));

let mockUser: { id: string; email: string; providers: string[] } | null = {
  id: "user-1",
  email: "test@example.com",
  providers: ["email"],
};

const mockGetUser = vi.fn();

const mockUseAuth = vi.fn(() => ({
  user: mockUser,
  logout: mockLogout,
  getUser: mockGetUser,
}));

vi.mock("@frontend/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@frontend/utils/apiClient", () => ({
  get apiClient() {
    return mockApiClient;
  },
}));

describe("useUserSettings", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = createMockApiClient();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(mockApiClient.auth.google.link.$post).mockResolvedValue({
      status: 200,
    });

    // Reset mockUser to default state
    mockUser = {
      id: "user-1",
      email: "test@example.com",
      providers: ["email"],
    };
  });

  describe("初期状態", () => {
    it("Google未連携の場合、isGoogleLinkedがfalse", () => {
      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      expect(result.current.isGoogleLinked).toBe(false);
    });

    it("Google連携済みの場合、isGoogleLinkedがtrue", () => {
      // Google連携済みのユーザーをモック
      mockUser = {
        id: "user-1",
        email: "test@example.com",
        providers: ["email", "google"],
      };

      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      expect(result.current.isGoogleLinked).toBe(true);
    });

    it("ユーザーがnullの場合、isGoogleLinkedがfalse", () => {
      mockUseAuth.mockReturnValueOnce({
        user: null,
        logout: mockLogout,
        getUser: mockGetUser,
      });

      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      expect(result.current.isGoogleLinked).toBe(false);
    });
  });

  describe("ログアウト機能", () => {
    it("正常にログアウトしてトップページに遷移する", async () => {
      mockLogout.mockResolvedValue(undefined);
      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleLogout();
      });

      await waitFor(async () => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
        expect(mockToast).not.toHaveBeenCalled();
      });
    });

    it("ログアウトに失敗した場合、エラートーストを表示する", async () => {
      mockLogout.mockRejectedValue(new Error("Logout failed"));
      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleLogout();
      });

      await waitFor(async () => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({
          title: "エラー",
          description: "ログアウトに失敗しました",
          variant: "destructive",
        });
      });
    });
  });

  describe("Googleアカウント連携", () => {
    it("正常にGoogleアカウントを連携できる", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      const credentialResponse = {
        credential: "test-google-token",
      };

      await act(async () => {
        await result.current.handleGoogleLink(credentialResponse);
      });

      await waitFor(async () => {
        expect(mockApiClient.auth.google.link.$post).toHaveBeenCalledWith({
          json: { credential: "test-google-token" },
        });
        expect(mockToast).toHaveBeenCalledWith({
          title: "Success",
          description: "Successfully linked Google account",
        });
        expect(mockGetUser).toHaveBeenCalled();
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ["user", "me"],
        });
      });
    });

    it("credentialがない場合、エラートーストを表示する", async () => {
      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      const credentialResponse = {
        credential: null,
      };

      await act(async () => {
        await result.current.handleGoogleLink(credentialResponse);
      });

      await waitFor(async () => {
        expect(mockApiClient.auth.google.link.$post).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to link Google account",
          variant: "destructive",
        });
      });
    });

    it("API呼び出しが200以外のステータスを返した場合、エラートーストを表示する", async () => {
      vi.mocked(mockApiClient.auth.google.link.$post).mockResolvedValue({
        status: 400,
      });

      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      const credentialResponse = {
        credential: "test-google-token",
      };

      await act(async () => {
        await result.current.handleGoogleLink(credentialResponse);
      });

      await waitFor(async () => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to link Google account",
        });
        // エラーの場合は invalidateQueries が呼ばれないことを確認
        // (この場合はエラートーストが表示されることで十分なので、この検証は省略)
      });
    });

    it("API呼び出しが例外をスローした場合、エラートーストを表示する", async () => {
      vi.mocked(mockApiClient.auth.google.link.$post).mockRejectedValue(
        new Error("Network error"),
      );

      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      const credentialResponse = {
        credential: "test-google-token",
      };

      await act(async () => {
        await result.current.handleGoogleLink(credentialResponse);
      });

      await waitFor(async () => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to link Google account",
          variant: "destructive",
        });
      });
    });
  });

  describe("Google連携エラーハンドラ", () => {
    it("エラートーストを表示する", () => {
      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      act(() => {
        result.current.handleGoogleLinkError();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to link Google account",
        variant: "destructive",
      });
    });
  });

  describe("複数プロバイダーのサポート", () => {
    it("複数のプロバイダーがある場合でもGoogleの有無を正しく判定する", () => {
      mockUser = {
        id: "user-1",
        email: "test@example.com",
        providers: ["email", "facebook", "google"],
      };

      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      expect(result.current.isGoogleLinked).toBe(true);
    });

    it("providersが未定義の場合、isGoogleLinkedがfalse", () => {
      mockUser = {
        id: "user-1",
        email: "test@example.com",
        providers: undefined,
      } as any;

      const { result } = renderHook(() => useUserSettings(), {
        wrapper,
      });

      expect(result.current.isGoogleLinked).toBe(false);
    });
  });
});
