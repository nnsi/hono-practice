/**
 * HTTPクライアントを抽象化するインターフェース
 */
export type HttpClient = {
  /**
   * HTTPリクエストを実行
   * @param input URL or Request
   * @param init Request options
   * @returns Response
   */
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

/**
 * ブラウザのfetch APIを使用した実装
 */
export const createBrowserHttpClient = (): HttpClient => {
  return {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      return fetch(input, init);
    },
  };
};

/**
 * トークン管理を行うインターフェース
 */
export type TokenManager = {
  /**
   * トークンを取得
   */
  getToken: () => string | null;

  /**
   * トークンを設定
   */
  setToken: (token: string) => void;

  /**
   * トークンをクリア
   */
  clearToken: () => void;
};

/**
 * APIクライアントの設定
 */
export type ApiClientConfig = {
  /**
   * API基底URL
   */
  baseUrl: string;

  /**
   * HTTPクライアント
   */
  httpClient?: HttpClient;

  /**
   * トークンマネージャー
   */
  tokenManager?: TokenManager;

  /**
   * イベントバス（エラー通知用）
   */
  eventBus?: {
    emit: (eventName: string, detail?: any) => void;
  };

  /**
   * リトライ設定
   */
  retry?: {
    /**
     * 最大リトライ回数（デフォルト: 1）
     */
    maxRetries?: number;

    /**
     * リトライ対象のステータスコード（デフォルト: [401]）
     */
    retryableStatuses?: number[];
  };
};
