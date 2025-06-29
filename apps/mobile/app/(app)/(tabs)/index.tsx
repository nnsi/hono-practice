import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";


import { HomeScreen } from "../../../src/screens/HomeScreen";

const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
