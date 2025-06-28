import { StatusBar } from "expo-status-bar";

import { HomeScreen } from "../../src/screens/HomeScreen";

export default function Home() {
  return (
    <>
      <HomeScreen />
      <StatusBar style="auto" />
    </>
  );
}