import { Outlet, Link, createRootRoute, useRouterState } from "@tanstack/react-router";
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
import { LoginForm } from "../components/root";
import { useState, useRef, useEffect } from "react";

function RootComponent() {
  const { isLoggedIn, isLoading, login, logout } = useAuth();

  useSyncEngine(isLoggedIn);

  if (isLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-white">
        <div className="text-gray-400 text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginForm onLogin={login} />;
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
      {/* ヘッダーメニュー */}
      <div className="absolute top-3 right-3 z-50" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="メニュー"
        >
          <Menu size={20} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
            <Link
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
            >
              <Settings size={16} />
              設定
            </Link>
            <div className="border-t my-1" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 w-full text-left"
            >
              <LogOut size={16} />
              ログアウト
            </button>
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-[72px]">
        <Outlet />
      </main>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="max-w-3xl mx-auto flex justify-around items-center py-2">
          <NavItem to="/actiko" icon={LayoutGrid} label="Actiko" currentPath={currentPath} />
          <NavItem to="/daily" icon={CalendarDays} label="Daily" currentPath={currentPath} />
          <NavItem to="/stats" icon={BarChart3} label="Stats" currentPath={currentPath} />
          <NavItem to="/goals" icon={Target} label="Goal" currentPath={currentPath} />
          <NavItem to="/tasks" icon={CheckSquare} label="Tasks" currentPath={currentPath} />
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
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  currentPath: string;
}) {
  const isActive = currentPath === to || currentPath.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
        isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon size={20} />
      <span className={`text-[10px] ${isActive ? "font-bold" : ""}`}>{label}</span>
    </Link>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
