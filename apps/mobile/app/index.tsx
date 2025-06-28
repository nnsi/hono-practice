import { Redirect } from "expo-router";

export default function Index() {
  // リダイレクト先はユーザーの認証状態に基づいて_layout.tsxで決定される
  return <Redirect href="/(auth)" />;
}
