import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGooglePost = vi.hoisted(() => vi.fn());
const mockDevPost = vi.hoisted(() => vi.fn());
const mockSessionGet = vi.hoisted(() => vi.fn());
const mockLogoutPost = vi.hoisted(() => vi.fn());
const mockSetOnUnauthorized = vi.hoisted(() => vi.fn());

vi.mock("../utils/apiClient", () => ({
  adminClient: {
    admin: {
      auth: {
        google: { $post: mockGooglePost },
        "dev-login": { $post: mockDevPost },
        session: { $get: mockSessionGet },
        logout: { $post: mockLogoutPost },
      },
    },
  },
  setOnUnauthorized: mockSetOnUnauthorized,
}));

import { useAdminAuth } from "./useAdminAuth";

function renderAdminAuth() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAdminAuth(), { wrapper });
}

describe("useAdminAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionGet.mockResolvedValue({ ok: false, status: 401 });
    mockLogoutPost.mockResolvedValue({ ok: true, status: 200 });
  });

  it("restores the user from the HttpOnly server session", async () => {
    mockSessionGet.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ email: "admin@example.com", name: "Admin" }),
    });

    const { result } = renderAdminAuth();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user).toEqual({
      email: "admin@example.com",
      name: "Admin",
    });
    expect(sessionStorage.length).toBe(0);
  });

  it("uses the cookie response without storing a bearer token after login", async () => {
    mockGooglePost.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ email: "admin@example.com", name: "Admin" }),
    });

    const { result } = renderAdminAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.googleLogin("credential-1"));

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user).toEqual({
      email: "admin@example.com",
      name: "Admin",
    });
    expect(sessionStorage.length).toBe(0);
  });

  it("revokes the server session on logout", async () => {
    mockSessionGet.mockResolvedValue({
      ok: true,
      json: async () => ({ email: "admin@example.com", name: "Admin" }),
    });
    const { result } = renderAdminAuth();
    await waitFor(() => expect(result.current.isLoggedIn).toBe(true));

    await act(async () => result.current.logout());

    expect(mockLogoutPost).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.isLoggedIn).toBe(false));
  });

  it("sets an error when google login fails", async () => {
    mockGooglePost.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderAdminAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let error: unknown;
    await act(async () => {
      try {
        await result.current.googleLogin("credential-1");
      } catch (caught) {
        error = caught;
      }
    });
    expect(error).toEqual(
      expect.objectContaining({ message: "API error: 401" }),
    );
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.error).toBe("API error: 401");
  });
});
