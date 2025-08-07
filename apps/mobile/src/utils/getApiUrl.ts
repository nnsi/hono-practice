import { NativeModules, Platform } from "react-native";

import { getMobileApiUrl } from "@frontend-shared/utils/apiUrl";
import * as Application from "expo-application";
import Constants from "expo-constants";

/**
 * プラットフォームと実行環境に応じたAPI URLを取得する
 */
export function getApiUrl(): string {
  // Expo Goアプリで実行されているかをチェック
  const applicationId = Application.applicationId;
  const isExpoGo =
    !applicationId ||
    applicationId === "" ||
    applicationId === "host.exp.Exponent";

  // デバッガーホストの取得
  let debuggerHost = Constants.expoConfig?.hostUri;

  // scriptURLからも取得を試みる（Expo Goの場合）
  if (!debuggerHost && isExpoGo) {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/http:\/\/([\d.]+):(\d+)/);
      if (match?.[1]) {
        debuggerHost = `${match[1]}:8081`;
      }
    }
  }

  return getMobileApiUrl({
    isDevelopment: __DEV__,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    apiPort: process.env.EXPO_PUBLIC_API_PORT || "3456",
    mobilePlatform: Platform.OS as "ios" | "android" | "web",
    isExpoGo,
    debuggerHost,
  });
}

/**
 * 現在の接続情報をログ出力（デバッグ用）
 */
export function logConnectionInfo(): void {
  console.log("=== Connection Info ===");
  console.log("Platform:", Platform.OS);
  console.log("__DEV__:", __DEV__);
  console.log(
    "Application ID:",
    Application.applicationId || "(empty - Expo Go)",
  );
  console.log("API URL:", getApiUrl());
  if (NativeModules.SourceCode?.scriptURL) {
    console.log("Script URL:", NativeModules.SourceCode.scriptURL);
  }
  if (Constants.expoConfig?.hostUri) {
    console.log("Expo Host:", Constants.expoConfig.hostUri);
  }
  console.log("======================");
}
