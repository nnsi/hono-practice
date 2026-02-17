import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import "../main.css";

import { useAuth } from "@hooks/useAuth";

import { OfflineToggle } from "./components/dev/OfflineToggle";
import { AuthProvider } from "./providers/AuthProvider";
import { EventBusProvider } from "./providers/EventBusProvider";
import { NetworkStatusProvider } from "./providers/NetworkStatusProvider";
import { TokenProvider } from "./providers/TokenProvider";
import { routeTree } from "./routeTree.gen";
import { createWindowEventBus } from "./services/abstractions";
import { createLocalStorageProvider } from "./services/abstractions/StorageProvider";
import { createApiClient } from "./utils/apiClient";
import { createTokenStore } from "./utils/createTokenStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 1000 * 60 * 60 * 24, // 24時間
      staleTime: 0, // 常に最新データを取得
      refetchOnMount: "always", // 常にマウント時にフェッチ
      refetchOnWindowFocus: true, // ウィンドウフォーカス時にフェッチ
      networkMode: "offlineFirst", // オフライン時もキャッシュから返す
    },
    mutations: {
      retry: false,
      networkMode: "offlineFirst", // オフライン時にmutationを自動pause
    },
  },
});

// クエリキャッシュの永続化設定
const PERSIST_QUERY_KEYS = new Set([
  "activity",
  "activity-logs-daily",
  "activity-stats-monthly",
  "tasks",
  "task",
  "goals",
  "goal",
]);

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "actiko-query-cache",
});

// onlineManager は apps/frontend/src/utils/onlineManager.ts で管理

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

// EventBusの作成
const eventBus = createWindowEventBus();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24時間
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const key = query.queryKey[0] as string;
              return PERSIST_QUERY_KEYS.has(key);
            },
            shouldDehydrateMutation: (mutation) => {
              return mutation.state.isPaused;
            },
          },
        }}
        onSuccess={() => {
          // アプリ起動時にpausedなmutationを再開
          queryClient.resumePausedMutations().then(() => {
            queryClient.invalidateQueries();
          });
        }}
      >
        <EventBusProvider eventBus={eventBus}>
          <TokenProvider tokenStore={tokenStore} eventBus={eventBus}>
            <AuthProvider apiClient={apiClient} eventBus={eventBus}>
              <NetworkStatusProvider>
                <RouterProviderWithAuth />
                <OfflineToggle />
              </NetworkStatusProvider>
            </AuthProvider>
          </TokenProvider>
        </EventBusProvider>
      </PersistQueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
