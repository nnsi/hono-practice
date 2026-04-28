import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthState = vi.hoisted(() => {
  let token: string | null = null;

  return {
    reset: () => {
      token = null;
    },
    getAdminToken: vi.fn(() => token),
    setAdminToken: vi.fn((next: string | null) => {
      token = next;
    }),
    setOnUnauthorized: vi.fn(),
  };
});

const mockGooglePost = vi.hoisted(() => vi.fn());
const mockDevPost = vi.hoisted(() => vi.fn());

vi.mock("../utils/apiClient", () => ({
  adminClient: {
    admin: {
      auth: {
        google: { $post: mockGooglePost },
        "dev-login": { $post: mockDevPost },
      },
    },
  },
  getAdminToken: mockAuthState.getAdminToken,
  setAdminToken: mockAuthState.setAdminToken,
  setOnUnauthorized: mockAuthState.setOnUnauthorized,
}));

import { useAdminAuth } from "./useAdminAuth";

describe("useAdminAuth", () => {
  beforeEach(() => {
    mockAuthState.reset();
    mockAuthState.getAdminToken.mockClear();
    mockAuthState.setAdminToken.mockClear();
    mockAuthState.setOnUnauthorized.mockClear();
    mockGooglePost.mockReset();
    mockDevPost.mockReset();
    sessionStorage.clear();
  });

  it("stores the token and user after google login succeeds", async () => {
    mockGooglePost.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: "token-1",
        email: "admin@example.com",
        name: "Admin",
      }),
    });

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.googleLogin("credential-1");
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user).toEqual({
      email: "admin@example.com",
      name: "Admin",
    });
    expect(result.current.error).toBeNull();
    expect(sessionStorage.getItem("admin_token")).toBe("token-1");
    expect(JSON.parse(sessionStorage.getItem("admin_user") ?? "null")).toEqual({
      email: "admin@example.com",
      name: "Admin",
    });
  });

  it("sets an error when google login fails", async () => {
    mockGooglePost.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.googleLogin("credential-1");
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toEqual(
      expect.objectContaining({ message: "API error: 401" }),
    );
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.error).toBe("API error: 401");
    expect(sessionStorage.getItem("admin_token")).toBeNull();
    expect(sessionStorage.getItem("admin_user")).toBeNull();
  });
});
