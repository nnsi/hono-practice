import type { ReactNode } from "react";

import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Mail, Users } from "lucide-react";

type Props = {
  user: { email: string; name: string } | null;
  onLogout: () => void;
  children: ReactNode;
};

const navItems = [
  { to: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { to: "/users", label: "ユーザー", icon: Users },
  { to: "/contacts", label: "問い合わせ", icon: Mail },
] as const;

export function AdminLayout({ user, onLogout, children }: Props) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h1 className="text-lg font-bold text-gray-900">Actiko Admin</h1>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === "/" ? currentPath === "/" : currentPath.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="mb-2 truncate text-xs text-gray-500">
            {user?.email}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
