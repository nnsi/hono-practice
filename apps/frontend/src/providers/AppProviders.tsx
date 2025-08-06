import { type ReactNode, StrictMode, useMemo } from "react";

import { createWindowEventBus } from "@frontend/services/abstractions";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./AuthProvider";
import { EventBusProvider } from "./EventBusProvider";
import { NetworkStatusProvider } from "./NetworkStatusProvider";
import { TokenProvider } from "./TokenProvider";

type AppProvidersProps = {
  children: ReactNode;
  queryClient?: QueryClient;
  googleClientId?: string;
  strictMode?: boolean;
};

/**
 * アプリケーション全体のプロバイダーをまとめたラッパーコンポーネント
 *
 * プロバイダーの順序：
 * 1. StrictMode (optional)
 * 2. GoogleOAuthProvider
 * 3. QueryClientProvider
 * 4. EventBusProvider
 * 5. TokenProvider
 * 6. AuthProvider
 * 7. NetworkStatusProvider
 *
 * この順序は依存関係に基づいており、変更すると動作に影響する可能性があります。
 */
export function AppProviders({
  children,
  queryClient,
  googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
    "test-client-id",
  strictMode = true,
}: AppProvidersProps) {
  // EventBusの作成
  const eventBus = useMemo(() => createWindowEventBus(), []);

  // QueryClientのデフォルト設定
  const client =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 1000 * 60 * 60 * 24, // 24時間
          staleTime: 0,
          refetchOnMount: "always",
          refetchOnWindowFocus: true,
        },
        mutations: {
          retry: false,
        },
      },
    });

  // コンテンツのラップ
  let content = (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={client}>
        <EventBusProvider eventBus={eventBus}>
          <TokenProvider eventBus={eventBus}>
            <AuthProvider eventBus={eventBus}>
              <NetworkStatusProvider>{children}</NetworkStatusProvider>
            </AuthProvider>
          </TokenProvider>
        </EventBusProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );

  // StrictModeでラップ（オプション）
  if (strictMode) {
    content = <StrictMode>{content}</StrictMode>;
  }

  return content;
}
