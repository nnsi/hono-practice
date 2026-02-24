import {
  Outlet,
  Link,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import {
  LayoutGrid,
  CalendarDays,
  BarChart3,
  Target,
  CheckSquare,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSyncEngine } from "../hooks/useSyncEngine";
import { LoginForm, CreateUserForm } from "../components/root";
import { useState, useRef, useEffect } from "react";

type AuthTab = "login" | "register";

function RootComponent() {
  const { isLoggedIn, isLoading, login, googleLogin, register, logout } =
    useAuth();
  const [authTab, setAuthTab] = useState<AuthTab>("login");

  useSyncEngine(isLoggedIn);

  if (isLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl font-bold tracking-tight brand-text">
            Actiko
          </span>
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
            <h1 className="text-4xl font-bold tracking-tight brand-text mb-2">
              Actiko
            </h1>
            <p className="text-sm text-gray-400 tracking-wide">
              活動を、最速で記録する
            </p>
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
            <LoginForm onLogin={login} onGoogleLogin={googleLogin} />
          ) : (
            <CreateUserForm
              onRegister={register}
              onGoogleLogin={googleLogin}
            />
          )}
        </div>
      </div>
    );
  }

  return <AuthenticatedLayout onLogout={logout} />;
}

function AuthenticatedLayout({ onLogout }: { onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="h-svh w-full max-w-3xl mx-auto flex flex-col relative bg-white">
      {/* Header menu */}
      <div className="absolute top-0 right-3 h-12 flex items-center z-50" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          aria-label="メニュー"
        >
          <Menu size={20} className="text-gray-500" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lifted border border-gray-200/60 py-1 z-50 animate-scale-in origin-top-right">
            <Link
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings size={16} className="text-gray-400" />
              設定
            </Link>
            <div className="border-t border-gray-100 my-1" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full text-left transition-colors"
            >
              <LogOut size={16} />
              ログアウト
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-[72px]">
        <Outlet />
      </main>

      {/* Bottom navigation — frosted glass */}
      <nav className="fixed bottom-0 left-0 right-0 glass-nav z-40">
        <div className="max-w-3xl mx-auto flex justify-around items-center pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <NavItem
            to="/actiko"
            icon={LayoutGrid}
            label="Actiko"
            currentPath={currentPath}
          />
          <NavItem
            to="/daily"
            icon={CalendarDays}
            label="Daily"
            currentPath={currentPath}
          />
          <NavItem
            to="/stats"
            icon={BarChart3}
            label="Stats"
            currentPath={currentPath}
          />
          <NavItem
            to="/goals"
            icon={Target}
            label="Goal"
            currentPath={currentPath}
          />
          <NavItem
            to="/tasks"
            icon={CheckSquare}
            label="Tasks"
            currentPath={currentPath}
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  currentPath,
}: {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  currentPath: string;
}) {
  const isActive = currentPath === to || currentPath.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`nav-pill ${isActive ? "nav-pill-active" : ""} flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
        isActive
          ? "text-amber-600"
          : "text-gray-400 hover:text-gray-600"
      }`}
    >
      <Icon
        size={20}
        className={isActive ? "drop-shadow-sm" : ""}
      />
      <span
        className={`text-[10px] tracking-wide ${isActive ? "font-semibold" : "font-medium"}`}
      >
        {label}
      </span>
    </Link>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
