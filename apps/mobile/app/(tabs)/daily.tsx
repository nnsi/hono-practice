import { Redirect } from "expo-router";

// Daily 画面は Actiko 画面へ統合した。古いリンクから来た場合に備えて転送する。
export default function DailyScreen() {
  return <Redirect href="/(tabs)" />;
}
