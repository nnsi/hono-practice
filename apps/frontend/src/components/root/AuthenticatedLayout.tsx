import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Globe, LogOut, Menu, Settings } from "lucide-react";

import { DebtFeedbackToast } from "../common/DebtFeedbackToast";
import {
  useTabPreference,
  useTabPreferenceSync,
} from "../setting/tabPreferenceStore";
import { WEB_TAB_METADATA } from "./tabMetadata";

export function AuthenticatedLayout({
  onLogout,
}: {
  onLogout: () => Promise<{ ok: boolean }>;
}) {
  const { t, i18n } = useTranslation(["common", "settings"]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutWarning, setLogoutWarning] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { preference } = useTabPreference();
  useTabPreferenceSync();

  const visibleTabs = preference.tabs.map((key) => WEB_TAB_METADATA[key]);
  const hiddenTabs = Object.values(WEB_TAB_METADATA).filter(
    (tab) => !preference.tabs.includes(tab.key),
  );

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
      <div
        className="absolute top-0 right-3 h-12 flex items-center z-50"
        ref={menuRef}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          aria-label="Menu"
        >
          <Menu size={20} className="text-gray-500" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lifted border border-gray-200/60 py-1 z-50 animate-scale-in origin-top-right">
            <button
              type="button"
              onClick={() => {
                const next = i18n.language === "ja" ? "en" : "ja";
                i18n.changeLanguage(next);
                setMenuOpen(false);
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
            >
              <Globe size={16} className="text-gray-400" />
              {i18n.language === "ja" ? "English" : "日本語"}
            </button>
            {hiddenTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Icon size={16} className="text-gray-400" />
                  {tab.label}
                </Link>
              );
            })}
            <Link
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings size={16} className="text-gray-400" />
              {t("settings:heading")}
            </Link>
            <div className="border-t border-gray-100 my-1" />
            <button
              type="button"
              onClick={async () => {
                setLogoutWarning(false);
                const result = await onLogout();
                if (result.ok) {
                  setMenuOpen(false);
                } else {
                  // サーバー clear に失敗。httpOnly cookie が残ったままだと次回起動で
                  // 自動再ログインしてしまうため、メニューは閉じず再試行を促す
                  setLogoutWarning(true);
                }
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full text-left transition-colors"
            >
              <LogOut size={16} />
              {t("settings:logout")}
            </button>
            {logoutWarning && (
              <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
                {t("settings:logoutFailedRetry")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-[72px]">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-nav z-40">
        <div className="max-w-3xl mx-auto flex justify-around items-center pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {visibleTabs.map((tab) => (
            <NavItem
              key={tab.key}
              to={tab.to}
              icon={tab.icon}
              label={tab.label}
              currentPath={currentPath}
            />
          ))}
        </div>
      </nav>

      <DebtFeedbackToast />
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
        isActive ? "text-amber-600" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      <Icon size={20} className={isActive ? "drop-shadow-sm" : ""} />
      <span
        className={`text-[10px] tracking-wide ${isActive ? "font-semibold" : "font-medium"}`}
      >
        {label}
      </span>
    </Link>
  );
}
