import type {
  AuthResponse,
  AuthState,
  LoginCredentials,
  SignupData,
  User,
} from "../types/auth";

// APIクライアントの型定義（プラットフォーム固有の実装を抽象化）
type ApiClient = {
  auth: {
    login: {
      $post: (options: { json: LoginCredentials }) => Promise<Response>;
    };
    logout: {
      $post: () => Promise<Response>;
    };
    token?: {
      $post: () => Promise<Response>;
    };
  };
  user: {
    me: {
      $get: () => Promise<Response>;
    };
    $post: (options: { json: SignupData }) => Promise<Response>;
  };
};

// ユーザー情報取得ロジック
export async function fetchCurrentUser(apiClient: ApiClient): Promise<User> {
  const response = await apiClient.user.me.$get();

  if (!response.ok) {
    throw new Error("ユーザー情報の取得に失敗しました");
  }

  return await response.json();
}

// ログインロジック（API呼び出しのみ）
export async function performLogin(
  apiClient: ApiClient,
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const response = await apiClient.auth.login.$post({
    json: credentials,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "ログインに失敗しました");
  }

  return await response.json();
}

// ログアウトロジック（API呼び出しのみ）
export async function performLogout(apiClient: ApiClient): Promise<void> {
  try {
    await apiClient.auth.logout.$post();
  } catch {
    // ログアウトAPIのエラーは無視
    console.warn("Logout API failed, but continuing with local cleanup");
  }
}

// サインアップロジック（API呼び出しのみ）
export async function performSignup(
  apiClient: ApiClient,
  userData: SignupData,
): Promise<AuthResponse> {
  const response = await apiClient.user.$post({
    json: userData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "アカウント作成に失敗しました");
  }

  return await response.json();
}

// 初期認証チェックのフロー
export type InitAuthOptions = {
  hasStoredToken: boolean;
  onTokenRefresh: () => Promise<string | null>;
  onUserFetch: (token: string) => Promise<User>;
};

export async function initializeAuth(
  options: InitAuthOptions,
): Promise<AuthState> {
  const { hasStoredToken, onTokenRefresh, onUserFetch } = options;

  if (!hasStoredToken) {
    return {
      isAuthenticated: false,
      user: null,
      isLoading: false,
    };
  }

  try {
    // トークンリフレッシュを試みる
    const newToken = await onTokenRefresh();

    if (!newToken) {
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false,
      };
    }

    // ユーザー情報を取得
    const user = await onUserFetch(newToken);

    return {
      isAuthenticated: true,
      user,
      isLoading: false,
    };
  } catch (error) {
    console.error("Auth initialization failed:", error);
    return {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: error as Error,
    };
  }
}
