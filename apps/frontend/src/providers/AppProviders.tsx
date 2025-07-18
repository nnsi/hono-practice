import { type ReactNode, StrictMode } from "react";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { AuthProvider } from "./AuthProvider";
import { NetworkStatusProvider } from "./NetworkStatusProvider";
import { TokenProvider } from "./TokenProvider";

type AppProvidersProps = {
  children: ReactNode;
  queryClient?: QueryClient;
  enablePersist?: boolean;
  googleClientId?: string;
  strictMode?: boolean;
};

/**
 * アプリケーション全体のプロバイダーをまとめたラッパーコンポーネント
 *
 * プロバイダーの順序：
 * 1. StrictMode (optional)
 * 2. GoogleOAuthProvider
 * 3. PersistQueryClientProvider
 * 4. TokenProvider
 * 5. AuthProvider
 * 6. NetworkStatusProvider
 *
 * この順序は依存関係に基づいており、変更すると動作に影響する可能性があります。
 */
export function AppProviders({
  children,
  queryClient,
  enablePersist = true,
  googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
    "test-client-id",
  strictMode = true,
}: AppProvidersProps) {
  // QueryClientのデフォルト設定
  const client =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 1000 * 60 * 60 * 24, // 24時間
          networkMode: "offlineFirst",
          staleTime: 0,
          refetchOnMount: "always",
          refetchOnWindowFocus: () => {
            const networkStatus = window.localStorage.getItem("network-status");
            return networkStatus !== "offline";
          },
        },
        mutations: {
          retry: false,
        },
      },
    });

  // Persisterの設定
  const persister = enablePersist
    ? createSyncStoragePersister({
        storage: window.localStorage,
        key: "actiko-query-cache",
        throttleTime: 1000,
      })
    : undefined;

  // コンテンツのラップ
  let content = (
    <GoogleOAuthProvider clientId={googleClientId}>
      {enablePersist && persister ? (
        <PersistQueryClientProvider
          client={client}
          persistOptions={{ persister }}
        >
          <TokenProvider>
            <AuthProvider>
              <NetworkStatusProvider>{children}</NetworkStatusProvider>
            </AuthProvider>
          </TokenProvider>
        </PersistQueryClientProvider>
      ) : (
        <QueryClientProvider client={client}>
          <TokenProvider>
            <AuthProvider>
              <NetworkStatusProvider>{children}</NetworkStatusProvider>
            </AuthProvider>
          </TokenProvider>
        </QueryClientProvider>
      )}
    </GoogleOAuthProvider>
  );

  // StrictModeでラップ（オプション）
  if (strictMode) {
    content = <StrictMode>{content}</StrictMode>;
  }

  return content;
}
