import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { LoginScreen } from "../../src/screens/LoginScreen";

export default function Login() {
  const router = useRouter();

  return (
    <>
      <LoginScreen onSwitchToSignup={() => router.push("/(auth)/signup")} />
      <StatusBar style="auto" />
    </>
  );
}
