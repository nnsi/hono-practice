/**
 * プラットフォーム別のAPI URL生成ロジック
 */

export type Platform = "web" | "mobile";

export interface ApiUrlConfig {
  isDevelopment?: boolean;
  apiUrl?: string;
  apiPort?: string;
  hostname?: string;
  protocol?: string;
  mobilePlatform?: "ios" | "android" | "web";
  isExpoGo?: boolean;
  debuggerHost?: string;
}

/**
 * Web環境用のAPI URL生成
 */
export function getWebApiUrl(config: ApiUrlConfig = {}): string {
  const {
    isDevelopment = process.env.NODE_ENV === "development",
    apiUrl,
    apiPort = "3456",
    hostname = typeof window !== "undefined"
      ? window.location.hostname
      : "localhost",
    protocol = typeof window !== "undefined"
      ? window.location.protocol
      : "http:",
  } = config;

  if (apiUrl) {
    return apiUrl;
  }

  if (isDevelopment) {
    return `${protocol}//${hostname}:${apiPort}/`;
  }

  // 本番環境ではAPIのURLを環境変数から取得するか、同一オリジンを使用
  return apiUrl || "";
}

/**
 * Mobile環境用のAPI URL生成
 */
export function getMobileApiUrl(config: ApiUrlConfig = {}): string {
  const {
    isDevelopment = true,
    apiUrl,
    apiPort = "3456",
    mobilePlatform,
    isExpoGo = false,
    debuggerHost,
  } = config;

  // 環境変数でAPI URLが設定されている場合はそれを使用
  if (apiUrl) {
    return apiUrl;
  }

  // 開発環境での自動設定
  if (isDevelopment) {
    // Expo Goの場合
    if (isExpoGo && debuggerHost) {
      const hostname = debuggerHost.split(":")[0];
      return `http://${hostname}:${apiPort}/`;
    }

    // プラットフォーム別の処理
    if (mobilePlatform === "android") {
      // Androidエミュレータの場合
      return `http://10.0.2.2:${apiPort}/`;
    }
    if (mobilePlatform === "ios") {
      // iOSシミュレータの場合
      return `http://localhost:${apiPort}/`;
    }
    if (mobilePlatform === "web") {
      // Webブラウザの場合
      return `http://localhost:${apiPort}/`;
    }
  }

  // 実機の場合、またはその他の場合
  if (debuggerHost) {
    const hostname = debuggerHost.split(":")[0];
    return `http://${hostname}:${apiPort}/`;
  }

  // フォールバック
  return `http://localhost:${apiPort}/`;
}

/**
 * プラットフォーム別のAPI URL生成関数
 *
 * @param platform - 対象プラットフォーム（'web' | 'mobile'）
 * @param config - プラットフォーム固有の設定
 * @returns API URL
 */
export function getApiUrl(
  platform: Platform,
  config: ApiUrlConfig = {},
): string {
  switch (platform) {
    case "web":
      return getWebApiUrl(config);
    case "mobile":
      return getMobileApiUrl(config);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
