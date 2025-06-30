import { Redirect } from "expo-router";

export default function AuthIndex() {
  // デフォルトでloginページにリダイレクト
  return <Redirect href="/(auth)/login" />;
}
