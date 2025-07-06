import { NativeModules, Platform } from "react-native";

import * as Application from "expo-application";
import Constants from "expo-constants";

/**
 * プラットフォームと実行環境に応じたAPI URLを取得する
 */
export function getApiUrl(): string {
  // 環境変数でAPI URLが設定されている場合はそれを使用
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // APIポートを環境変数から取得（デフォルト: 3456）
  const apiPort = process.env.EXPO_PUBLIC_API_PORT || "3456";

  // 開発環境での自動設定
  if (__DEV__) {
    // Expo Goアプリで実行されているかをチェック
    const applicationId = Application.applicationId;
    const isExpoGo =
      !applicationId ||
      applicationId === "" ||
      applicationId === "host.exp.Exponent";

    if (isExpoGo) {
      // Expo Goの場合、開発マシンのIPアドレスを取得
      // まずConstants.expoConfig?.hostUriから取得を試みる
      const debuggerHost = Constants.expoConfig?.hostUri;
      if (debuggerHost) {
        // debuggerHostは "192.168.1.100:8081" のような形式
        const hostname = debuggerHost.split(":")[0];
        return `http://${hostname}:${apiPort}/`;
      }

      // scriptURLからも取得を試みる
      const scriptURL = NativeModules.SourceCode?.scriptURL;
      if (scriptURL) {
        // scriptURLは "http://192.168.1.100:8081/..." のような形式
        const match = scriptURL.match(/http:\/\/([\d.]+):/);
        if (match?.[1]) {
          const devMachineIp = match[1];
          return `http://${devMachineIp}:${apiPort}/`;
        }
      }
    }

    // Expo Go以外の場合は従来の処理
    if (Platform.OS === "android") {
      // Androidエミュレータの場合
      // 10.0.2.2 はAndroidエミュレータからホストマシンへのエイリアス
      return `http://10.0.2.2:${apiPort}/`;
    }
    if (Platform.OS === "ios") {
      // iOSシミュレータの場合
      // シミュレータはホストマシンと同じネットワークスペースを共有
      return `http://localhost:${apiPort}/`;
    }
    if (Platform.OS === "web") {
      // Webブラウザの場合
      return `http://localhost:${apiPort}/`;
    }
  }

  // 実機の場合、またはその他の場合
  // ExpoのデバッガーホストのIPアドレスを使用
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    // debuggerHostは "192.168.1.100:8081" のような形式
    const hostname = debuggerHost.split(":")[0];
    return `http://${hostname}:${apiPort}/`;
  }

  // フォールバック
  return `http://localhost:${apiPort}/`;
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
