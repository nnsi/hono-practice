import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAdminAuth = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/useAdminAuth", () => ({
  useAdminAuth: mockUseAdminAuth,
}));

vi.mock("./AdminLayout", () => ({
  AdminLayout: ({
    user,
    children,
  }: {
    user: { email: string; name: string } | null;
    children: ReactNode;
  }) => (
    <div data-testid="layout" data-email={user?.email ?? ""}>
      {children}
    </div>
  ),
}));

vi.mock("../login/LoginPage", () => ({
  LoginPage: () => <div data-testid="login-page" />,
}));

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
}));

import { AdminRoot } from "./AdminRoot";

describe("AdminRoot", () => {
  beforeEach(() => {
    mockUseAdminAuth.mockReset();
  });

  it("shows the loading state while auth is resolving", () => {
    mockUseAdminAuth.mockReturnValue({
      isLoading: true,
      isLoggedIn: false,
      user: null,
      googleLogin: vi.fn(),
      devLogin: vi.fn(),
      logout: vi.fn(),
      error: null,
    });

    render(<AdminRoot />);

    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("routes unauthenticated users to the login page", () => {
    mockUseAdminAuth.mockReturnValue({
      isLoading: false,
      isLoggedIn: false,
      user: null,
      googleLogin: vi.fn(),
      devLogin: vi.fn(),
      logout: vi.fn(),
      error: null,
    });

    render(<AdminRoot />);

    expect(screen.getByTestId("login-page")).toBeTruthy();
  });

  it("renders the admin layout when logged in", () => {
    mockUseAdminAuth.mockReturnValue({
      isLoading: false,
      isLoggedIn: true,
      user: { email: "admin@example.com", name: "Admin" },
      googleLogin: vi.fn(),
      devLogin: vi.fn(),
      logout: vi.fn(),
      error: null,
    });

    render(<AdminRoot />);

    expect(screen.getByTestId("layout")).toBeTruthy();
    expect(screen.getByTestId("layout").getAttribute("data-email")).toBe(
      "admin@example.com",
    );
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });
});
