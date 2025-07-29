import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import "../main.css";
import { useAuth } from "@hooks/useAuth";

import { AuthProvider } from "./providers/AuthProvider";
import { NetworkStatusProvider } from "./providers/NetworkStatusProvider";
import { TokenProvider } from "./providers/TokenProvider";
import { routeTree } from "./routeTree.gen";
import { createLocalStorageProvider } from "./services/abstractions/StorageProvider";
import { createApiClient } from "./utils/apiClient";
import { createTokenStore } from "./utils/createTokenStore";

// ネットワーク状態を取得するためのヘルパー
function getIsOnline(): boolean {
  const networkStatus = window.localStorage.getItem("network-status");
  return networkStatus !== "offline";
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 1000 * 60 * 60 * 24, // 24時間
      networkMode: "offlineFirst",
      staleTime: 0, // 常に最新データを取得
      refetchOnMount: "always", // 常にマウント時にフェッチ（オフライン時はnetworkModeで制御）
      refetchOnWindowFocus: () => getIsOnline(), // オンライン時はウィンドウフォーカス時にもフェッチ
    },
    mutations: {
      retry: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "actiko-query-cache",
  throttleTime: 1000,
});

const router = createRouter({
  routeTree: routeTree,
  context: { auth: undefined! },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

declare global {
  interface WindowEventMap {
    "api-error": CustomEvent<string>;
    unauthorized: CustomEvent<string>;
    "token-refreshed": CustomEvent<string>;
    "token-refresh-needed": Event;
  }
}

const RouterProviderWithAuth: React.FC = () => {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
};

// E2Eテスト環境またはlocalStorageモードの場合はlocalStorageベースのtokenStoreを使用
const isE2EMode =
  import.meta.env.VITE_E2E_TEST === "true" ||
  import.meta.env.VITE_USE_LOCALSTORAGE_TOKEN === "true";
const tokenStore = isE2EMode
  ? createTokenStore(createLocalStorageProvider())
  : undefined;

// E2E環境ではAPIクライアントもlocalStorageベースのtokenStoreを使用
const apiClient =
  isE2EMode && tokenStore
    ? createApiClient({ tokenManager: tokenStore })
    : undefined;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <TokenProvider tokenStore={tokenStore}>
          <AuthProvider apiClient={apiClient}>
            <NetworkStatusProvider>
              <RouterProviderWithAuth />
            </NetworkStatusProvider>
          </AuthProvider>
        </TokenProvider>
      </PersistQueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
