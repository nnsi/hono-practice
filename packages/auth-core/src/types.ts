// 認証関連の共通型定義

export type User = {
  id: string;
  name: string | null;
  providers: string[];
};

export type AuthTokens = {
  token: string;
  refreshToken: string;
};

export type TokenStorage = {
  getToken(): string | null;
  setToken(token: string | null): void;
  clearToken(): void;
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
};

export type AuthActions = {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  getUser: () => Promise<void>;
};
