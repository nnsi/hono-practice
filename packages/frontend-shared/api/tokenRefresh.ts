export type TokenRefreshOptions = {
  getRefreshToken: () => Promise<string | null>;
  refreshEndpoint: string;
  platform: "web" | "mobile";
  onSuccess: (token: string, refreshToken?: string) => Promise<void>;
  onFailure: () => Promise<void>;
};

// リフレッシュキューの管理
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

export function createTokenRefreshHandler(options: TokenRefreshOptions) {
  const { getRefreshToken, refreshEndpoint, platform, onSuccess, onFailure } =
    options;

  return async function refreshToken(): Promise<string | null> {
    // 既にリフレッシュ中の場合はキューに追加
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push(resolve);
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();

      // プラットフォーム別のリクエスト設定
      const requestInit: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (platform === "web") {
        // Web: Cookieベース
        requestInit.credentials = "include";
      } else {
        // Mobile: Bearerトークン
        if (!refreshToken) {
          throw new Error("リフレッシュトークンがありません");
        }
        requestInit.headers = {
          ...requestInit.headers,
          Authorization: `Bearer ${refreshToken}`,
        };
        requestInit.credentials = "omit";
      }

      const response = await fetch(refreshEndpoint, requestInit);

      if (!response.ok) {
        throw new Error("トークンリフレッシュに失敗しました");
      }

      const data = await response.json();
      const newToken = data.token;

      // 成功コールバック
      await onSuccess(newToken, data.refreshToken);

      // キューの処理
      refreshQueue.forEach((resolve) => resolve(newToken));
      refreshQueue = [];

      return newToken;
    } catch (error) {
      // 失敗コールバック
      await onFailure();

      // キューの処理
      refreshQueue.forEach((resolve) => resolve(null));
      refreshQueue = [];

      throw error;
    } finally {
      isRefreshing = false;
    }
  };
}

// リフレッシュ状態のリセット（テスト用）
export function resetRefreshState() {
  isRefreshing = false;
  refreshQueue = [];
}
