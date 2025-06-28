import { Stack } from "expo-router";
import "../global.css";

import { AuthProvider } from "../src/contexts/AuthContext";
import { TokenProvider } from "../src/providers/TokenProvider";

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
