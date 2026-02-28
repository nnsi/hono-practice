import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "../src/hooks/useAuth";
import { useSyncEngine } from "../src/hooks/useSyncEngine";
import { createContext, useContext } from "react";
import "../global.css";

const queryClient = new QueryClient();

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  register: (
    name: string,
    loginId: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  userId: null,
  login: async () => {},
  googleLogin: async () => {},
  register: async () => {},
  logout: () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export default function RootLayout() {
  const auth = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useSyncEngine(auth.isLoggedIn);

  useEffect(() => {
    if (auth.isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!auth.isLoggedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (auth.isLoggedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [auth.isLoggedIn, auth.isLoading, segments]);

  if (auth.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <StatusBar style="auto" />
        <Slot />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
