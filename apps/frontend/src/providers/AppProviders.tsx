import { type ReactNode, StrictMode } from "react";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./AuthProvider";
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
 * 4. TokenProvider
 * 5. AuthProvider
 * 6. NetworkStatusProvider
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
        <TokenProvider>
          <AuthProvider>
            <NetworkStatusProvider>{children}</NetworkStatusProvider>
          </AuthProvider>
        </TokenProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );

  // StrictModeでラップ（オプション）
  if (strictMode) {
    content = <StrictMode>{content}</StrictMode>;
  }

  return content;
}
