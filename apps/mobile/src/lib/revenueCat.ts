import { Platform } from "react-native";
import Purchases from "react-native-purchases";

const REVENUECAT_API_KEY_IOS =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? "";
const REVENUECAT_API_KEY_ANDROID =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? "";

export async function initRevenueCat(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const apiKey =
    Platform.OS === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (!apiKey) return;

  Purchases.configure({ apiKey });
  await Purchases.logIn(userId);
}
