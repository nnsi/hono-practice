# 認証フローの共通化設計

## 概要
WebアプリとReact Nativeアプリ間で認証ロジックを共通化するための設計ドキュメント。プラットフォーム固有のトークン管理やリフレッシュ方法の違いをAdapter パターンで抽象化し、認証フローのビジネスロジックを統一する。

## 現状分析

### 現在の実装状況

#### Web版 (`apps/frontend/src/providers/AuthProvider.tsx`)
- **トークン管理**: 
  - アクセストークン: メモリ（tokenStore）
  - リフレッシュトークン: httpOnlyクッキー
- **プロバイダー構造**: AuthProvider + TokenProvider（2層構造）
- **リフレッシュ方式**: Cookieベース（credentials: include）
- **イベント通知**: CustomEvent（window.dispatchEvent）
- **初期化処理**: `/auth/token`エンドポイントでリフレッシュトークンを検証

#### Mobile版 (`apps/mobile/src/contexts/AuthContext.tsx`)
- **トークン管理**:
  - アクセストークン: メモリ（tokenStore）+ AsyncStorage
  - リフレッシュトークン: AsyncStorage
- **プロバイダー構造**: AuthContext（単一）
- **リフレッシュ方式**: Bearerトークン（Authorizationヘッダー）
- **イベント通知**: EventEmitter（eventBus）
- **初期化処理**: AsyncStorageから復元してユーザー情報取得

### 主な差異点

1. **リフレッシュトークンの管理方法**
   - Web: httpOnlyクッキー（XSS対策）
   - Mobile: AsyncStorage（React Nativeの制約）

2. **リフレッシュトークンの送信方法**
   - Web: Cookieで自動送信
   - Mobile: Authorizationヘッダーで明示的送信

3. **永続化戦略**
   - Web: ブラウザがCookieを管理
   - Mobile: AsyncStorageに明示的に保存

4. **セキュリティモデル**
   - Web: CSRF対策（SameSite=Strict）
   - Mobile: ローカルストレージのセキュリティに依存

## 設計方針

### 1. レイヤー構造

```
┌─────────────────────────────────────────────┐
│           Application Layer                 │
│  (Login, Signup, Settings Components)       │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│            Auth Hook Layer                  │
│  (useAuth - 共通化されたインターフェース)    │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│          Auth Service Layer                 │
│  (認証ロジック、状態管理、トークン管理)       │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│         Platform Adapter Layer              │
│  (Token, Session, Crypto Adapters)          │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│        Platform Specific Layer              │
│  (Cookie, AsyncStorage, SecureStore...)      │
└─────────────────────────────────────────────┘
```

### 2. Adapterインターフェース設計

#### TokenStorageAdapter
```typescript
type TokenStorageAdapter = {
  // アクセストークン管理
  getAccessToken: () => Promise<string | null>;
  setAccessToken: (token: string) => Promise<void>;
  clearAccessToken: () => Promise<void>;
  
  // リフレッシュトークン管理
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (token: string) => Promise<void>;
  clearRefreshToken: () => Promise<void>;
  
  // 初期化とクリーンアップ
  initialize: () => Promise<void>;
  clearAll: () => Promise<void>;
};
```

#### SessionAdapter
```typescript
type SessionAdapter = {
  // セッション情報の永続化
  saveSession: (session: SessionData) => Promise<void>;
  loadSession: () => Promise<SessionData | null>;
  clearSession: () => Promise<void>;
  
  // セッションの有効性チェック
  isSessionValid: (session: SessionData) => boolean;
};

type SessionData = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId?: string;
};
```

#### AuthRequestAdapter
```typescript
type AuthRequestAdapter = {
  // ログインリクエスト
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  
  // トークンリフレッシュ
  refreshToken: (refreshToken?: string) => Promise<RefreshResponse>;
  
  // ログアウト
  logout: (refreshToken?: string) => Promise<void>;
  
  // ユーザー情報取得
  getCurrentUser: () => Promise<User>;
  
  // サインアップ
  signup: (userData: SignupData) => Promise<AuthResponse>;
};

type LoginCredentials = {
  login_id: string;
  password: string;
};

type AuthResponse = {
  token: string;
  refreshToken?: string;
  user?: User;
};

type RefreshResponse = {
  token: string;
  refreshToken?: string;
};
```

#### CryptoAdapter
```typescript
type CryptoAdapter = {
  // 暗号化キーの管理（オフライン機能用）
  generateKey: () => Promise<string>;
  saveKey: (key: string) => Promise<void>;
  loadKey: () => Promise<string | null>;
  clearKey: () => Promise<void>;
  
  // トークンの暗号化（必要に応じて）
  encryptToken: (token: string) => Promise<string>;
  decryptToken: (encryptedToken: string) => Promise<string>;
};
```

### 3. 共通Auth Serviceの実装

```typescript
// packages/frontend-shared/auth/createAuthService.ts
type CreateAuthServiceOptions = {
  adapters: {
    tokenStorage: TokenStorageAdapter;
    session: SessionAdapter;
    authRequest: AuthRequestAdapter;
    crypto?: CryptoAdapter;
    event: EventAdapter;
  };
  config?: {
    tokenRefreshThreshold?: number; // デフォルト: 1分前
    maxRetryAttempts?: number;
    enableAutoRefresh?: boolean;
  };
};

export function createAuthService(options: CreateAuthServiceOptions) {
  const { adapters, config } = options;
  
  // 状態管理
  let currentUser: User | null = null;
  let isRefreshing = false;
  let refreshTimer: NodeJS.Timeout | null = null;
  
  // トークンの有効期限を解析
  const parseTokenExpiry = (token: string): number => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch {
      return Date.now() + 15 * 60 * 1000; // Default 15 minutes
    }
  };
  
  // トークンリフレッシュのスケジューリング
  const scheduleTokenRefresh = (token: string) => {
    if (!config?.enableAutoRefresh) return;
    
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    
    const expiresAt = parseTokenExpiry(token);
    const refreshAt = expiresAt - (config?.tokenRefreshThreshold || 60000);
    const delay = Math.max(0, refreshAt - Date.now());
    
    refreshTimer = setTimeout(async () => {
      try {
        await refreshToken();
      } catch (error) {
        adapters.event.emit('auth:refresh-failed', error);
      }
    }, delay);
  };
  
  // 初期化処理
  const initialize = async (): Promise<AuthState> => {
    try {
      await adapters.tokenStorage.initialize();
      
      // セッション復元を試みる
      const session = await adapters.session.loadSession();
      if (session && adapters.session.isSessionValid(session)) {
        await adapters.tokenStorage.setAccessToken(session.accessToken);
        
        try {
          // ユーザー情報を取得
          currentUser = await adapters.authRequest.getCurrentUser();
          
          // 自動リフレッシュをスケジュール
          scheduleTokenRefresh(session.accessToken);
          
          return {
            isAuthenticated: true,
            user: currentUser,
            isLoading: false,
          };
        } catch (error) {
          // トークンが無効な場合はリフレッシュを試みる
          if (isTokenError(error)) {
            return await refreshToken();
          }
          throw error;
        }
      }
      
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false,
      };
    } catch (error) {
      console.error('Auth initialization failed:', error);
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error as Error,
      };
    }
  };
  
  // ログイン処理
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      adapters.event.emit('auth:login-start');
      
      const response = await adapters.authRequest.login(credentials);
      
      // トークンを保存
      await adapters.tokenStorage.setAccessToken(response.token);
      if (response.refreshToken) {
        await adapters.tokenStorage.setRefreshToken(response.refreshToken);
      }
      
      // セッションを保存
      await adapters.session.saveSession({
        accessToken: response.token,
        refreshToken: response.refreshToken,
        expiresAt: parseTokenExpiry(response.token),
        userId: response.user?.id,
      });
      
      // ユーザー情報を取得
      currentUser = response.user || await adapters.authRequest.getCurrentUser();
      
      // 暗号化キーを生成（オフライン機能用）
      if (adapters.crypto) {
        const key = await adapters.crypto.generateKey();
        await adapters.crypto.saveKey(key);
      }
      
      // 自動リフレッシュをスケジュール
      scheduleTokenRefresh(response.token);
      
      adapters.event.emit('auth:login-success', currentUser);
    } catch (error) {
      adapters.event.emit('auth:login-error', error);
      throw error;
    }
  };
  
  // トークンリフレッシュ処理
  const refreshToken = async (): Promise<AuthState> => {
    if (isRefreshing) {
      // 既にリフレッシュ中の場合は待機
      return new Promise((resolve) => {
        const handler = (state: AuthState) => {
          adapters.event.off('auth:refresh-complete', handler);
          resolve(state);
        };
        adapters.event.on('auth:refresh-complete', handler);
      });
    }
    
    isRefreshing = true;
    
    try {
      adapters.event.emit('auth:refresh-start');
      
      const refreshToken = await adapters.tokenStorage.getRefreshToken();
      const response = await adapters.authRequest.refreshToken(refreshToken);
      
      // 新しいトークンを保存
      await adapters.tokenStorage.setAccessToken(response.token);
      if (response.refreshToken) {
        await adapters.tokenStorage.setRefreshToken(response.refreshToken);
      }
      
      // セッションを更新
      await adapters.session.saveSession({
        accessToken: response.token,
        refreshToken: response.refreshToken,
        expiresAt: parseTokenExpiry(response.token),
        userId: currentUser?.id,
      });
      
      // 自動リフレッシュを再スケジュール
      scheduleTokenRefresh(response.token);
      
      const state: AuthState = {
        isAuthenticated: true,
        user: currentUser,
        isLoading: false,
      };
      
      adapters.event.emit('auth:refresh-success', response.token);
      adapters.event.emit('auth:refresh-complete', state);
      
      return state;
    } catch (error) {
      adapters.event.emit('auth:refresh-error', error);
      
      // リフレッシュ失敗時はログアウト
      await logout();
      
      const state: AuthState = {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error as Error,
      };
      
      adapters.event.emit('auth:refresh-complete', state);
      
      return state;
    } finally {
      isRefreshing = false;
    }
  };
  
  // ログアウト処理
  const logout = async (): Promise<void> => {
    try {
      adapters.event.emit('auth:logout-start');
      
      // リフレッシュタイマーをクリア
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
      
      // バックエンドに通知（エラーは無視）
      try {
        const refreshToken = await adapters.tokenStorage.getRefreshToken();
        await adapters.authRequest.logout(refreshToken);
      } catch {
        // ログアウトAPIの失敗は無視
      }
      
      // ローカルの状態をクリア
      await adapters.tokenStorage.clearAll();
      await adapters.session.clearSession();
      
      if (adapters.crypto) {
        await adapters.crypto.clearKey();
      }
      
      currentUser = null;
      
      adapters.event.emit('auth:logout-success');
    } catch (error) {
      adapters.event.emit('auth:logout-error', error);
      throw error;
    }
  };
  
  // サインアップ処理
  const signup = async (userData: SignupData): Promise<void> => {
    try {
      adapters.event.emit('auth:signup-start');
      
      const response = await adapters.authRequest.signup(userData);
      
      // ログインと同じ処理
      await adapters.tokenStorage.setAccessToken(response.token);
      if (response.refreshToken) {
        await adapters.tokenStorage.setRefreshToken(response.refreshToken);
      }
      
      await adapters.session.saveSession({
        accessToken: response.token,
        refreshToken: response.refreshToken,
        expiresAt: parseTokenExpiry(response.token),
        userId: response.user?.id,
      });
      
      currentUser = response.user || await adapters.authRequest.getCurrentUser();
      
      if (adapters.crypto) {
        const key = await adapters.crypto.generateKey();
        await adapters.crypto.saveKey(key);
      }
      
      scheduleTokenRefresh(response.token);
      
      adapters.event.emit('auth:signup-success', currentUser);
    } catch (error) {
      adapters.event.emit('auth:signup-error', error);
      throw error;
    }
  };
  
  return {
    initialize,
    login,
    logout,
    signup,
    refreshToken,
    getCurrentUser: () => currentUser,
    getAuthState: (): AuthState => ({
      isAuthenticated: !!currentUser,
      user: currentUser,
      isLoading: false,
    }),
  };
}
```

### 4. プラットフォーム別実装

#### Web版Adapters
```typescript
// apps/frontend/src/adapters/auth/webAuthAdapters.ts

export const webTokenStorageAdapter: TokenStorageAdapter = {
  getAccessToken: async () => tokenStore.getToken(),
  setAccessToken: async (token) => tokenStore.setToken(token),
  clearAccessToken: async () => tokenStore.clearToken(),
  
  // Web版ではリフレッシュトークンはCookieで管理
  getRefreshToken: async () => null,
  setRefreshToken: async () => {},
  clearRefreshToken: async () => {},
  
  initialize: async () => {},
  clearAll: async () => tokenStore.clearToken(),
};

export const webSessionAdapter: SessionAdapter = {
  saveSession: async (session) => {
    // セッション情報をsessionStorageに保存（オプション）
    sessionStorage.setItem('auth-session', JSON.stringify({
      expiresAt: session.expiresAt,
      userId: session.userId,
    }));
  },
  
  loadSession: async () => {
    const data = sessionStorage.getItem('auth-session');
    if (!data) return null;
    
    try {
      const session = JSON.parse(data);
      // アクセストークンはメモリから取得
      const token = tokenStore.getToken();
      if (!token) return null;
      
      return {
        ...session,
        accessToken: token,
      };
    } catch {
      return null;
    }
  },
  
  clearSession: async () => {
    sessionStorage.removeItem('auth-session');
  },
  
  isSessionValid: (session) => {
    return session.expiresAt > Date.now();
  },
};

export const webAuthRequestAdapter: AuthRequestAdapter = {
  login: async (credentials) => {
    const response = await apiClient.auth.login.$post({
      json: credentials,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    
    return await response.json();
  },
  
  refreshToken: async () => {
    // Cookieベースなのでリフレッシュトークンは不要
    const response = await apiClient.auth.token.$post();
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    return await response.json();
  },
  
  logout: async () => {
    await apiClient.auth.logout.$post();
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.user.me.$get();
    
    if (!response.ok) {
      throw new Error('Failed to get user');
    }
    
    return await response.json();
  },
  
  signup: async (userData) => {
    const response = await apiClient.user.$post({
      json: userData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }
    
    return await response.json();
  },
};
```

#### Mobile版Adapters
```typescript
// apps/mobile/src/adapters/auth/mobileAuthAdapters.ts

export const mobileTokenStorageAdapter: TokenStorageAdapter = {
  getAccessToken: async () => {
    const token = tokenStore.getToken();
    if (token) return token;
    
    // AsyncStorageからも取得を試みる
    const stored = await AsyncStorage.getItem('accessToken');
    if (stored) {
      tokenStore.setToken(stored);
    }
    return stored;
  },
  
  setAccessToken: async (token) => {
    tokenStore.setToken(token);
    await AsyncStorage.setItem('accessToken', token);
  },
  
  clearAccessToken: async () => {
    tokenStore.clearToken();
    await AsyncStorage.removeItem('accessToken');
  },
  
  getRefreshToken: async () => {
    return await AsyncStorage.getItem('refreshToken');
  },
  
  setRefreshToken: async (token) => {
    await AsyncStorage.setItem('refreshToken', token);
  },
  
  clearRefreshToken: async () => {
    await AsyncStorage.removeItem('refreshToken');
  },
  
  initialize: async () => {
    // トークンをメモリに復元
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      tokenStore.setToken(token);
    }
  },
  
  clearAll: async () => {
    tokenStore.clearToken();
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
  },
};

export const mobileSessionAdapter: SessionAdapter = {
  saveSession: async (session) => {
    await AsyncStorage.setItem('auth-session', JSON.stringify(session));
  },
  
  loadSession: async () => {
    const data = await AsyncStorage.getItem('auth-session');
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },
  
  clearSession: async () => {
    await AsyncStorage.removeItem('auth-session');
  },
  
  isSessionValid: (session) => {
    return session.expiresAt > Date.now();
  },
};

export const mobileAuthRequestAdapter: AuthRequestAdapter = {
  login: async (credentials) => {
    const response = await apiClient.auth.login.$post({
      json: credentials,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    
    return await response.json();
  },
  
  refreshToken: async (refreshToken) => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Mobile版はBearerトークンでリフレッシュ
    const response = await fetch(`${API_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    return await response.json();
  },
  
  logout: async () => {
    const token = tokenStore.getToken();
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (token && refreshToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Refresh-Token': refreshToken,
        },
      });
    }
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.user.me.$get();
    
    if (!response.ok) {
      throw new Error('Failed to get user');
    }
    
    return await response.json();
  },
  
  signup: async (userData) => {
    const response = await apiClient.user.$post({
      json: userData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }
    
    return await response.json();
  },
};
```

### 5. 共通useAuthフックの実装

```typescript
// packages/frontend-shared/auth/createUseAuth.ts
export function createUseAuth(authService: AuthService) {
  return function useAuth() {
    const [state, setState] = useState<AuthState>({
      isAuthenticated: false,
      user: null,
      isLoading: true,
    });
    
    useEffect(() => {
      // 初期化
      authService.initialize().then(setState);
      
      // イベントリスナーの登録
      const unsubscribers = [
        authService.on('auth:state-change', setState),
        authService.on('auth:logout-success', () => {
          setState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
        }),
      ];
      
      return () => {
        unsubscribers.forEach(unsubscribe => unsubscribe());
      };
    }, []);
    
    const login = useCallback(async (credentials: LoginCredentials) => {
      setState(prev => ({ ...prev, isLoading: true }));
      try {
        await authService.login(credentials);
        setState(authService.getAuthState());
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false, error: error as Error }));
        throw error;
      }
    }, []);
    
    const logout = useCallback(async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      try {
        await authService.logout();
      } finally {
        setState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    }, []);
    
    const signup = useCallback(async (userData: SignupData) => {
      setState(prev => ({ ...prev, isLoading: true }));
      try {
        await authService.signup(userData);
        setState(authService.getAuthState());
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false, error: error as Error }));
        throw error;
      }
    }, []);
    
    const refreshToken = useCallback(async () => {
      const newState = await authService.refreshToken();
      setState(newState);
    }, []);
    
    return {
      ...state,
      login,
      logout,
      signup,
      refreshToken,
    };
  };
}
```

### 6. セキュリティ考慮事項

#### トークン保護
1. **アクセストークン**
   - メモリ内でのみ管理（XSS攻撃時の被害を最小化）
   - 短い有効期限（15分）
   - HTTPSでの送信を強制

2. **リフレッシュトークン**
   - Web: httpOnlyクッキー（JSからアクセス不可）
   - Mobile: AsyncStorage（デバイスレベルの暗号化）
   - 長い有効期限（1ヶ月）

#### 攻撃対策
1. **XSS対策**
   - トークンをlocalStorageに保存しない
   - Content Security Policyの適用
   - 入力値のサニタイゼーション

2. **CSRF対策**
   - SameSite=Strictクッキー（Web版）
   - カスタムヘッダーの検証
   - Originヘッダーの確認

3. **中間者攻撃対策**
   - HTTPSの強制
   - Certificate Pinning（Mobile版）
   - HSTSヘッダーの使用

#### 暗号化
```typescript
// Mobile版の追加セキュリティ層（オプション）
export const mobileCryptoAdapter: CryptoAdapter = {
  generateKey: async () => {
    // React Native Keychainを使用
    const key = await generateSecureRandom(32);
    return base64Encode(key);
  },
  
  saveKey: async (key) => {
    await Keychain.setInternetCredentials(
      'com.actiko.app',
      'encryption-key',
      key,
      { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED }
    );
  },
  
  loadKey: async () => {
    const credentials = await Keychain.getInternetCredentials('com.actiko.app');
    return credentials ? credentials.password : null;
  },
  
  clearKey: async () => {
    await Keychain.resetInternetCredentials('com.actiko.app');
  },
  
  encryptToken: async (token) => {
    // 実装は省略（必要に応じて）
    return token;
  },
  
  decryptToken: async (encryptedToken) => {
    // 実装は省略（必要に応じて）
    return encryptedToken;
  },
};
```

### 7. エラーハンドリング

```typescript
// packages/frontend-shared/auth/errors.ts
export class AuthError extends Error {
  constructor(message: string, public code: AuthErrorCode) {
    super(message);
    this.name = 'AuthError';
  }
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_FAILED = 'REFRESH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isTokenError(error: unknown): boolean {
  if (error instanceof AuthError) {
    return error.code === AuthErrorCode.TOKEN_EXPIRED ||
           error.code === AuthErrorCode.UNAUTHORIZED;
  }
  return false;
}
```

### 8. 移行計画

#### Phase 1: 基盤構築（1週間）
1. Adapterインターフェースの実装
2. AuthServiceの実装
3. プラットフォーム別Adapterの実装
4. ユニットテストの作成

#### Phase 2: 統合（1週間）
1. 共通useAuthフックの実装
2. 既存コンポーネントの移行
3. E2Eテストの更新
4. パフォーマンステスト

#### Phase 3: 最適化（3日）
1. トークンリフレッシュの最適化
2. エラーハンドリングの改善
3. セキュリティ監査
4. ドキュメントの整備

### 9. テスト戦略

#### ユニットテスト
```typescript
describe('AuthService', () => {
  it('ログイン成功時にトークンを保存する', async () => {
    const mockAdapters = createMockAdapters();
    const authService = createAuthService({ adapters: mockAdapters });
    
    await authService.login({ login_id: 'test', password: 'password' });
    
    expect(mockAdapters.tokenStorage.setAccessToken).toHaveBeenCalledWith('mock-token');
    expect(mockAdapters.session.saveSession).toHaveBeenCalled();
  });
  
  it('トークン期限切れ時に自動リフレッシュする', async () => {
    // テスト実装
  });
  
  it('リフレッシュ失敗時にログアウトする', async () => {
    // テスト実装
  });
});
```

#### 統合テスト
```typescript
describe('Auth Integration', () => {
  it('Web版で完全な認証フローが動作する', async () => {
    // ログイン → API呼び出し → リフレッシュ → ログアウト
  });
  
  it('Mobile版で完全な認証フローが動作する', async () => {
    // ログイン → API呼び出し → リフレッシュ → ログアウト
  });
});
```

### 10. パフォーマンス考慮事項

1. **トークンリフレッシュの最適化**
   - キューイングによる重複リクエストの防止
   - 適切なタイミングでの事前リフレッシュ
   - エクスポネンシャルバックオフ

2. **初期化処理の最適化**
   - 並列処理の活用
   - キャッシュの利用
   - 遅延読み込み

3. **メモリ管理**
   - タイマーの適切なクリーンアップ
   - イベントリスナーの解除
   - 不要な状態の削除

## 実装優先度

1. **高優先度**
   - TokenStorageAdapter
   - AuthRequestAdapter
   - 基本的な認証フロー（login/logout）

2. **中優先度**
   - SessionAdapter
   - 自動トークンリフレッシュ
   - エラーハンドリング

3. **低優先度**
   - CryptoAdapter
   - 高度なセキュリティ機能
   - 分析・監視機能

## 成功指標

1. **コード重複の削減**: 認証ロジックの90%以上を共通化
2. **セキュリティ**: OWASP認証セキュリティチェックリストの遵守
3. **パフォーマンス**: 認証処理の応答時間を既存実装の±10%以内
4. **信頼性**: トークンリフレッシュ成功率99%以上
5. **開発効率**: 新規認証機能の実装時間を50%削減

## リスクと対策

1. **リスク**: プラットフォーム固有のセキュリティ要件
   - **対策**: 各プラットフォームのベストプラクティスに従った実装

2. **リスク**: 既存の認証フローとの互換性
   - **対策**: 段階的な移行とFeature flagの使用

3. **リスク**: トークンリフレッシュの競合状態
   - **対策**: 適切なロック機構とキューイングの実装

## 今後の拡張

1. **生体認証のサポート**
   - TouchID/FaceID（iOS）
   - Fingerprint/Face認証（Android）
   - WebAuthn（Web）

2. **多要素認証（MFA）**
   - TOTP（Time-based One-Time Password）
   - SMS認証
   - プッシュ通知認証

3. **ソーシャルログインの拡張**
   - Apple Sign In
   - GitHub認証
   - Microsoft認証

4. **セッション管理の高度化**
   - デバイス管理
   - セッションの可視化
   - リモートログアウト

## 参考資料

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [React Native Security](https://reactnative.dev/docs/security)
- [Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)