import { useEffect, useState } from "react";

import {
  getSimulatedOffline,
  setSimulatedOffline,
} from "@frontend/hooks/useNetworkStatus";
import { setOnlineManagerOnline } from "@frontend/utils/onlineManager";
import { useMutationState } from "@tanstack/react-query";

/**
 * 開発環境専用のオフライン切り替えUIコンポーネント
 * import.meta.env.DEV でのみ表示される
 */
export function OfflineToggle() {
  if (!import.meta.env.DEV) return null;

  return <OfflineToggleInner />;
}

function OfflineToggleInner() {
  const [isOffline, setIsOffline] = useState(getSimulatedOffline());
  const pendingMutations = useMutationState({
    filters: { status: "pending" },
  });

  const pendingCount = pendingMutations.length;

  const toggle = () => {
    const newState = !isOffline;
    setIsOffline(newState);
    setSimulatedOffline(newState);
    setOnlineManagerOnline(!newState);
  };

  // キーボードショートカット (Ctrl+Shift+O) でトグル
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "O") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <button
      type="button"
      onClick={toggle}
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-sm font-medium transition-colors ${
        isOffline
          ? "bg-orange-500 text-white hover:bg-orange-600"
          : "bg-green-500 text-white hover:bg-green-600"
      }`}
      title={`${isOffline ? "オフライン" : "オンライン"} (Ctrl+Shift+O)`}
    >
      {isOffline ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <title>Offline</title>
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <title>Online</title>
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      )}
      {isOffline ? "OFF" : "ON"}
      {pendingCount > 0 && (
        <span className="bg-white text-orange-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
          {pendingCount}
        </span>
      )}
    </button>
  );
}
