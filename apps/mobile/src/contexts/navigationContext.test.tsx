// @vitest-environment jsdom
import { memo } from "react";

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: {
    isLoggedIn: true,
    isLoading: false,
    syncReady: true,
    userId: "user-1" as string | null,
  },
  theme: { preference: "system" as "system" | "dark", isDark: false },
  setTheme: vi.fn(),
  renderScreen: vi.fn(),
}));

vi.mock("@packages/auth-client", () => ({
  useAuthController: () => mocks.auth,
  useAuthBootstrap: vi.fn(),
}));
vi.mock("../auth/authController", () => ({
  authController: {
    login: vi.fn(),
    googleLogin: vi.fn(),
    appleLogin: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));
vi.mock("../auth/mobileAuthDiagnostics", () => ({
  startMobileAuthDiagnosticFlush: vi.fn(),
}));
vi.mock("../auth/planReconciliation", () => ({
  refreshPlanFromBackend: vi.fn(),
}));
vi.mock("../lib/provisionVoiceApiKey", () => ({
  provisionVoiceApiKey: vi.fn(),
}));
vi.mock("../hooks/useTheme", () => ({
  useTheme: () => ({ ...mocks.theme, setTheme: mocks.setTheme }),
}));

import { useAuth } from "../hooks/useAuth";
import { AuthContext, useAuthContext } from "./AuthContext";
import { ThemeProvider, useThemeContext } from "./ThemeContext";

// A mounted screen can be kept by the navigator while the root observes a new
// route. Only real auth/theme changes should invalidate its context consumers.
const Screen = memo(function Screen() {
  const auth = useAuthContext();
  const theme = useThemeContext();
  mocks.renderScreen();
  return (
    <span>{`${auth.userId ?? "guest"}/${auth.syncReady}/${theme.isDark}`}</span>
  );
});

function Root({ route }: { route: string }) {
  const auth = useAuth();
  return (
    <ThemeProvider>
      <AuthContext.Provider value={auth}>
        <div data-route={route}>
          <Screen />
        </div>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  mocks.auth = {
    isLoggedIn: true,
    isLoading: false,
    syncReady: true,
    userId: "user-1",
  };
  mocks.theme = { preference: "system", isDark: false };
  vi.clearAllMocks();
});
afterEach(cleanup);

it("does not redraw mounted screens on unrelated root/navigation updates", () => {
  const view = render(<Root route="actiko" />);
  expect(view.getByText("user-1/true/false")).toBeTruthy();
  for (const route of ["daily", "actiko", "daily", "actiko"]) {
    view.rerender(<Root route={route} />);
  }
  expect(mocks.renderScreen).toHaveBeenCalledTimes(1);
});

it("still propagates theme changes, sync readiness and logout", () => {
  const view = render(<Root route="actiko" />);
  mocks.theme = { preference: "dark", isDark: true };
  view.rerender(<Root route="actiko" />);
  expect(view.getByText("user-1/true/true")).toBeTruthy();

  mocks.auth = { ...mocks.auth, syncReady: false };
  view.rerender(<Root route="actiko" />);
  expect(view.getByText("user-1/false/true")).toBeTruthy();

  mocks.auth = { ...mocks.auth, isLoggedIn: false, userId: null };
  view.rerender(<Root route="actiko" />);
  expect(view.getByText("guest/false/true")).toBeTruthy();
  expect(mocks.renderScreen).toHaveBeenCalledTimes(4);
});
