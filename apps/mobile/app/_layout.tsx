import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import "../global.css";

import { AuthProvider } from "../src/contexts/AuthContext";
import { GlobalDateProvider } from "../src/providers/GlobalDateProvider";
import { TokenProvider } from "../src/providers/TokenProvider";

// グローバルなQueryClientインスタンス
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      gcTime: 10 * 60 * 1000, // 10分（旧cacheTime）
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  return (
    <TokenProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <GlobalDateProvider>
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(app)" options={{ headerShown: false }} />
            </Stack>
          </GlobalDateProvider>
        </QueryClientProvider>
      </AuthProvider>
    </TokenProvider>
  );
}
