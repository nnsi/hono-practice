import { Stack } from "expo-router";

import { TokenProvider } from "../src/providers/TokenProvider";
import { AuthProvider } from "../src/contexts/AuthContext";

export default function RootLayout() {
  return (
    <TokenProvider>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </TokenProvider>
  );
}