// 認証状態の共通型
export type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error?: Error;
};

// ユーザー情報の共通型
export type User = {
  id: string;
  email?: string;
  nickname?: string;
  display_name?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
  providers?: string[];
  providerEmails?: Record<string, string>;
};

// ログイン認証情報
export type LoginCredentials = {
  login_id: string;
  password: string;
};

// サインアップ情報
export type SignupData = {
  email: string;
  password: string;
  nickname?: string;
};

// 認証レスポンス
export type AuthResponse = {
  token: string;
  refreshToken?: string;
  user?: User;
};

// トークンリフレッシュレスポンス
export type RefreshTokenResponse = {
  token: string;
  refreshToken?: string;
};

// 認証エラーコード
export enum AuthErrorCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  REFRESH_FAILED = "REFRESH_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
}

// 認証関連のコンテキスト型
export type AuthContextType = AuthState & {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  signup?: (data: SignupData) => Promise<void>;
  refreshToken?: () => Promise<void>;
};
