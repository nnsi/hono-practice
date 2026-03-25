import { useState } from "react";

import {
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";

import { ActikoLogo } from "../components/common/ActikoLogo";
import { LegalModal } from "../components/common/LegalModal";
import {
  AuthenticatedLayout,
  CreateUserForm,
  LoginForm,
} from "../components/root";
import { useAuth } from "../hooks/useAuth";
import { useNavigationSync } from "../hooks/useNavigationSync";
import { useSyncEngine } from "../hooks/useSyncEngine";

type AuthTab = "login" | "register";

function RootComponent() {
  const {
    isLoggedIn,
    isLoading,
    syncReady,
    userId,
    login,
    googleLogin,
    appleLogin,
    register,
    logout,
  } = useAuth();
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );

  const routerState = useRouterState();
  const isLegalPage =
    routerState.location.pathname === "/privacy" ||
    routerState.location.pathname === "/terms";

  useSyncEngine(syncReady);
  useNavigationSync(syncReady, userId);

  if (isLegalPage) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <ActikoLogo className="w-48" />
          <div className="w-8 h-0.5 bg-gray-300 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Brand */}
          <div className="text-center mb-10">
            <ActikoLogo className="w-56 mx-auto" />
          </div>

          {/* Auth tabs */}
          <div className="flex mb-6 bg-gray-200/60 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setAuthTab("login")}
              className={`flex-1 py-2 text-sm font-medium text-center rounded-lg transition-all duration-200 ${
                authTab === "login"
                  ? "bg-white text-gray-900 shadow-soft"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => setAuthTab("register")}
              className={`flex-1 py-2 text-sm font-medium text-center rounded-lg transition-all duration-200 ${
                authTab === "register"
                  ? "bg-white text-gray-900 shadow-soft"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              新規登録
            </button>
          </div>

          {authTab === "login" ? (
            <LoginForm
              onLogin={login}
              onGoogleLogin={googleLogin}
              onAppleLogin={appleLogin}
            />
          ) : (
            <CreateUserForm
              onRegister={register}
              onGoogleLogin={googleLogin}
              onAppleLogin={appleLogin}
            />
          )}

          {/* Legal links */}
          <div className="mt-6 text-center text-xs text-gray-400 space-x-3">
            <button
              type="button"
              onClick={() => setLegalModal("privacy")}
              className="hover:text-gray-600 underline"
            >
              プライバシーポリシー
            </button>
            <button
              type="button"
              onClick={() => setLegalModal("terms")}
              className="hover:text-gray-600 underline"
            >
              利用規約
            </button>
          </div>
          {legalModal && (
            <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
          )}
        </div>
      </div>
    );
  }

  return <AuthenticatedLayout onLogout={logout} />;
}

export const Route = createRootRoute({
  component: RootComponent,
});
