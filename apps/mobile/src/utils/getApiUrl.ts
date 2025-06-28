import { Platform } from "react-native";

import Constants from "expo-constants";

/**
 * プラットフォームと実行環境に応じたAPI URLを取得する
 */
export function getApiUrl(): string {
  // 環境変数でAPI URLが設定されている場合はそれを使用
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 開発環境での自動設定
  if (__DEV__) {
    if (Platform.OS === "android") {
      // Androidエミュレータの場合
      // 10.0.2.2 はAndroidエミュレータからホストマシンへのエイリアス
      return "http://10.0.2.2:3456";
    }
    if (Platform.OS === "ios") {
      // iOSシミュレータの場合
      // シミュレータはホストマシンと同じネットワークスペースを共有
      return "http://localhost:3456";
    }
    if (Platform.OS === "web") {
      // Webブラウザの場合
      return "http://localhost:3456";
    }
  }

  // 実機の場合、またはその他の場合
  // ExpoのデバッガーホストのIPアドレスを使用
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    // debuggerHostは "192.168.1.100:8081" のような形式
    const hostname = debuggerHost.split(":")[0];
    return `http://${hostname}:3456`;
  }

  // フォールバック
  return "http://localhost:3456";
}

/**
 * 現在の接続情報をログ出力（デバッグ用）
 */
export function logConnectionInfo(): void {
  console.log("=== Connection Info ===");
  console.log("Platform:", Platform.OS);
  console.log("__DEV__:", __DEV__);
  console.log("API URL:", getApiUrl());
  if (Constants.expoConfig?.hostUri) {
    console.log("Expo Host:", Constants.expoConfig.hostUri);
  }
  console.log("======================");
}
