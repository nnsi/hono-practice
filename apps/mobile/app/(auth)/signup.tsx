import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SignupScreen } from "../../src/screens/SignupScreen";

export default function Signup() {
  const router = useRouter();

  return (
    <>
      <SignupScreen onSwitchToLogin={() => router.push("/(auth)/login")} />
      <StatusBar style="auto" />
    </>
  );
}