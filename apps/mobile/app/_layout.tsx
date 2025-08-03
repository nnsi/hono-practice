import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import "../global.css";

import { AuthProvider } from "../src/contexts/AuthContext";
import { GlobalDateProvider } from "../src/providers/GlobalDateProvider";
import { TokenProvider } from "../src/providers/TokenProvider";
import { queryClient } from "../src/utils/queryClient";

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
