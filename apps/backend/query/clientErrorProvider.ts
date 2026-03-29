/**
 * クライアントエラーデータプロバイダーの抽象型。
 * actiko_client_errors データセットからプラットフォーム別のエラー情報を取得する。
 */
export type ClientErrorSummary = {
  web: number;
  ios: number;
  android: number;
};

export type ClientErrorDetail = {
  timestamp: string;
  errorType: string;
  message: string;
  platform: string;
  screen: string;
};

export type ClientErrorProvider = {
  getSummary: () => Promise<ClientErrorSummary>;
  getDetails: (platform: string) => Promise<ClientErrorDetail[]>;
};

export const EMPTY_CLIENT_ERROR_SUMMARY: ClientErrorSummary = {
  web: 0,
  ios: 0,
  android: 0,
};

/** 開発環境用モックプロバイダー */
export function newMockClientErrorProvider(): ClientErrorProvider {
  return {
    getSummary: async () => ({
      web: 12,
      ios: 3,
      android: 1,
    }),
    getDetails: async () => [
      {
        timestamp: new Date().toISOString(),
        errorType: "component_error",
        message: "Mock error for dev",
        platform: "web",
        screen: "/goals",
      },
    ],
  };
}

/** データなしプロバイダー */
export function newNullClientErrorProvider(): ClientErrorProvider {
  return {
    getSummary: async () => EMPTY_CLIENT_ERROR_SUMMARY,
    getDetails: async () => [],
  };
}
