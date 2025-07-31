# API通信層の抽象化設計

## 概要
WebアプリとReact Nativeアプリ間でAPI通信ロジックを共通化するための設計ドキュメント。プラットフォーム固有の実装はAdapter パターンで抽象化し、ビジネスロジックを両プラットフォームで共有可能にする。

## 現状分析

### 現在の実装状況
1. **Web版 (`apps/frontend/src/utils/apiClient.ts`)**
   - Hono Clientベースの実装
   - Cookieベースのリフレッシュトークン管理
   - CustomEventベースのイベント通知
   - `credentials: include`でCookie送信

2. **Mobile版 (`apps/mobile/src/utils/apiClient.ts`)**
   - AsyncStorageベースのトークン管理
   - リフレッシュトークンはBearerトークンとして送信
   - EventEmitterベースのイベント通知
   - `credentials: omit`（React Nativeの制約）

3. **共通パッケージ (`packages/frontend-shared/apiClient.ts`)**
   - 基本的なAPIクライアント実装
   - トークンリフレッシュロジック
   - Hono Clientラッパー

### 主な差異点
- **トークン管理方法**: Cookie vs AsyncStorage
- **認証ヘッダー**: Cookie vs Bearer Token（リフレッシュ時）
- **イベント通知**: CustomEvent vs EventEmitter
- **credentials設定**: include vs omit
- **デバッグログ**: Mobileのみ詳細ログ出力

## 設計方針

### 1. レイヤー構造
```
┌─────────────────────────────────────────────┐
│            Application Layer                │
│  (useActivities, useGoals, useTimer...)     │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│           API Client Layer                  │
│  (共通化されたAPIクライアント実装)           │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│         Platform Adapter Layer              │
│  (HTTP, Storage, Event, Auth Adapters)      │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│        Platform Specific Layer              │
│  (fetch, localStorage, AsyncStorage...)      │
└─────────────────────────────────────────────┘
```

### 2. Adapterインターフェース設計

#### HTTPAdapter
```typescript
type HTTPAdapter = {
  fetch: (url: string | URL, init?: RequestInit) => Promise<Response>;
  getDefaultHeaders: () => Record<string, string>;
  configureRequest: (init: RequestInit, context: RequestContext) => RequestInit;
};

type RequestContext = {
  isAuthEndpoint: boolean;
  isRefreshEndpoint: boolean;
  requiresAuth: boolean;
};
```

#### AuthAdapter
```typescript
type AuthAdapter = {
  getAccessToken: () => Promise<string | null>;
  setAccessToken: (token: string) => Promise<void>;
  clearAccessToken: () => Promise<void>;
  
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (token: string) => Promise<void>;
  clearRefreshToken: () => Promise<void>;
  
  configureAuthHeaders: (headers: Headers, token: string) => Headers;
  handleTokenRefresh: (apiUrl: string) => Promise<TokenRefreshResult>;
};

type TokenRefreshResult = {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: Error;
};
```

#### EventAdapter (既存を拡張)
```typescript
type APIEventAdapter = EventBusAdapter & {
  emitUnauthorized: (error?: Error) => void;
  emitTokenRefreshed: (token: string) => void;
  emitAPIError: (error: Error | string) => void;
  emitNetworkError: (error: Error) => void;
};
```

#### CacheAdapter
```typescript
type CacheAdapter = {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};
```

### 3. 共通APIクライアントの実装

```typescript
// packages/frontend-shared/api/createApiClient.ts
type CreateApiClientOptions = {
  baseUrl: string;
  adapters: {
    http: HTTPAdapter;
    auth: AuthAdapter;
    event: APIEventAdapter;
    cache?: CacheAdapter;
  };
  config?: {
    enableCache?: boolean;
    cacheTTL?: number;
    retryCount?: number;
    retryDelay?: number;
    timeout?: number;
  };
};

export function createApiClient(options: CreateApiClientOptions) {
  const { baseUrl, adapters, config } = options;
  
  // リフレッシュトークンのキューイング
  let isRefreshing = false;
  let refreshQueue: Array<() => void> = [];
  
  const customFetch = async (url: string | URL, init?: RequestInit) => {
    // 1. リクエストコンテキストの判定
    const context = determineRequestContext(url, init);
    
    // 2. 認証トークンの取得
    const token = context.requiresAuth ? await adapters.auth.getAccessToken() : null;
    
    // 3. リクエストの設定
    const configuredInit = adapters.http.configureRequest(init || {}, context);
    
    // 4. 認証ヘッダーの設定
    if (token && context.requiresAuth) {
      const headers = new Headers(configuredInit.headers);
      adapters.auth.configureAuthHeaders(headers, token);
      configuredInit.headers = headers;
    }
    
    // 5. キャッシュチェック（GETリクエストのみ）
    if (config?.enableCache && init?.method === 'GET' && adapters.cache) {
      const cachedData = await adapters.cache.get(url.toString());
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'X-Cache': 'HIT' }
        });
      }
    }
    
    try {
      // 6. HTTPリクエストの実行
      const response = await adapters.http.fetch(url, configuredInit);
      
      // 7. 401エラーのハンドリング
      if (response.status === 401 && !context.isAuthEndpoint) {
        if (!isRefreshing) {
          isRefreshing = true;
          
          try {
            const refreshResult = await adapters.auth.handleTokenRefresh(baseUrl);
            
            if (refreshResult.success) {
              adapters.event.emitTokenRefreshed(refreshResult.accessToken!);
              processRefreshQueue();
              
              // リトライ
              return customFetch(url, init);
            } else {
              adapters.event.emitUnauthorized(refreshResult.error);
              throw refreshResult.error;
            }
          } finally {
            isRefreshing = false;
          }
        } else {
          // キューに追加して待機
          return new Promise((resolve) => {
            refreshQueue.push(() => resolve(customFetch(url, init)));
          });
        }
      }
      
      // 8. エラーレスポンスのハンドリング
      if (!response.ok && response.status !== 401) {
        const error = await extractErrorFromResponse(response);
        adapters.event.emitAPIError(error);
        throw error;
      }
      
      // 9. 成功レスポンスのキャッシュ
      if (config?.enableCache && init?.method === 'GET' && response.ok && adapters.cache) {
        const data = await response.clone().json();
        await adapters.cache.set(url.toString(), data, config.cacheTTL);
      }
      
      return response;
      
    } catch (error) {
      // ネットワークエラーのハンドリング
      if (isNetworkError(error)) {
        adapters.event.emitNetworkError(error as Error);
      }
      throw error;
    }
  };
  
  // Hono Clientのラッパーを返す
  return hc<AppType>(baseUrl, {
    fetch: customFetch,
  });
}
```

### 4. プラットフォーム別実装

#### Web版実装
```typescript
// apps/frontend/src/adapters/api/webAdapters.ts
export const webHTTPAdapter: HTTPAdapter = {
  fetch: (url, init) => fetch(url, init),
  getDefaultHeaders: () => ({
    'Content-Type': 'application/json',
  }),
  configureRequest: (init, context) => ({
    ...init,
    credentials: context.isAuthEndpoint ? 'include' : 'omit',
    mode: 'cors',
  }),
};

export const webAuthAdapter: AuthAdapter = {
  getAccessToken: async () => tokenStore.getToken(),
  setAccessToken: async (token) => tokenStore.setToken(token),
  clearAccessToken: async () => tokenStore.clearToken(),
  
  getRefreshToken: async () => null, // Cookieベース
  setRefreshToken: async () => {}, // Cookieベース
  clearRefreshToken: async () => {}, // Cookieベース
  
  configureAuthHeaders: (headers, token) => {
    headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
  
  handleTokenRefresh: async (apiUrl) => {
    try {
      const response = await fetch(`${apiUrl}/auth/token`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          accessToken: data.token,
        };
      }
      
      return {
        success: false,
        error: new Error('Failed to refresh token'),
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  },
};
```

#### Mobile版実装
```typescript
// apps/mobile/src/adapters/api/mobileAdapters.ts
export const mobileHTTPAdapter: HTTPAdapter = {
  fetch: async (url, init) => {
    if (__DEV__) {
      console.log('Fetching:', url, init);
    }
    
    const response = await fetch(url, {
      ...init,
      credentials: 'omit', // React Nativeの制約
    });
    
    if (__DEV__) {
      console.log('Response:', response.status, response.statusText);
    }
    
    return response;
  },
  
  getDefaultHeaders: () => ({
    'Content-Type': 'application/json',
  }),
  
  configureRequest: (init, context) => ({
    ...init,
    credentials: 'omit',
  }),
};

export const mobileAuthAdapter: AuthAdapter = {
  getAccessToken: async () => {
    const token = tokenStore.getToken();
    if (token) return token;
    
    const storedToken = await AsyncStorage.getItem('accessToken');
    if (storedToken) {
      tokenStore.setToken(storedToken);
    }
    return storedToken;
  },
  
  setAccessToken: async (token) => {
    tokenStore.setToken(token);
    await AsyncStorage.setItem('accessToken', token);
  },
  
  clearAccessToken: async () => {
    tokenStore.clearToken();
    await AsyncStorage.removeItem('accessToken');
  },
  
  getRefreshToken: async () => AsyncStorage.getItem('refreshToken'),
  
  setRefreshToken: async (token) => {
    await AsyncStorage.setItem('refreshToken', token);
  },
  
  clearRefreshToken: async () => {
    await AsyncStorage.removeItem('refreshToken');
  },
  
  configureAuthHeaders: (headers, token) => {
    headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
  
  handleTokenRefresh: async (apiUrl) => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch(`${apiUrl}/auth/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
        },
        credentials: 'omit',
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          accessToken: data.token,
          refreshToken: data.refreshToken,
        };
      }
      
      return {
        success: false,
        error: new Error('Failed to refresh token'),
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  },
};
```

### 5. エラーハンドリングの統一

#### エラー型の定義
```typescript
// packages/frontend-shared/api/errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 401, 'AUTH_ERROR', details);
    this.name = 'AuthError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public errors: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationError';
  }
}
```

#### エラーハンドラー
```typescript
// packages/frontend-shared/api/errorHandler.ts
export function createErrorHandler(adapters: { event: APIEventAdapter }) {
  return {
    handleAPIError: (error: Error) => {
      if (error instanceof AuthError) {
        adapters.event.emitUnauthorized(error);
      } else if (error instanceof NetworkError) {
        adapters.event.emitNetworkError(error);
      } else if (error instanceof APIError) {
        adapters.event.emitAPIError(error);
      } else {
        adapters.event.emitAPIError(new APIError(
          error.message || 'Unknown error',
          500,
          'UNKNOWN_ERROR'
        ));
      }
    },
    
    extractErrorFromResponse: async (response: Response): Promise<APIError> => {
      try {
        const data = await response.json();
        
        if (response.status === 400 && data.errors) {
          return new ValidationError(data.message || 'Validation failed', data.errors);
        }
        
        if (response.status === 401) {
          return new AuthError(data.message || 'Unauthorized', data);
        }
        
        return new APIError(
          data.message || `HTTP ${response.status}`,
          response.status,
          data.code,
          data
        );
      } catch {
        return new APIError(
          `HTTP ${response.status}`,
          response.status
        );
      }
    },
  };
}
```

### 6. キャッシュ戦略

#### キャッシュポリシー
- **対象**: GETリクエストのみ
- **TTL**: デフォルト5分（設定可能）
- **キー**: URL + クエリパラメータ
- **無効化**: 
  - 同一リソースへのPOST/PUT/PATCH/DELETE時
  - 手動無効化
  - TTL期限切れ

#### 実装例
```typescript
// packages/frontend-shared/api/cache/memoryCache.ts
export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, { value: any; expires: number }>();
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }
  
  async set<T>(key: string, value: T, ttl = 300000): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }
  
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  async clear(): Promise<void> {
    this.cache.clear();
  }
}
```

### 7. 移行計画

#### Phase 1: 基盤構築（1週間）
1. Adapterインターフェースの実装
2. 共通APIクライアントの実装
3. プラットフォーム別Adapterの実装
4. ユニットテストの作成

#### Phase 2: 段階的移行（2週間）
1. 新規フックでの利用開始
2. 既存フックの段階的移行
3. E2Eテストでの検証
4. パフォーマンステスト

#### Phase 3: 最適化（1週間）
1. キャッシュ戦略の実装
2. リトライ機能の実装
3. タイムアウト処理の実装
4. デバッグツールの整備

### 8. テスト戦略

#### ユニットテスト
```typescript
// packages/frontend-shared/api/__tests__/createApiClient.test.ts
describe('createApiClient', () => {
  it('認証が必要なエンドポイントでトークンを送信する', async () => {
    const mockAdapters = createMockAdapters();
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      adapters: mockAdapters,
    });
    
    await client.activities.$get();
    
    expect(mockAdapters.auth.getAccessToken).toHaveBeenCalled();
    expect(mockAdapters.http.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });
  
  it('401エラー時にトークンをリフレッシュする', async () => {
    // テスト実装
  });
  
  it('ネットワークエラーを適切にハンドリングする', async () => {
    // テスト実装
  });
});
```

#### 統合テスト
```typescript
describe('API Client Integration', () => {
  it('Web版で正しく動作する', async () => {
    // 実際のブラウザ環境でのテスト
  });
  
  it('Mobile版で正しく動作する', async () => {
    // React Native環境でのテスト
  });
});
```

### 9. パフォーマンス考慮事項

1. **バンドルサイズ**
   - Tree-shakingの最適化
   - 不要なAdapterのexclude
   - Dynamic importの活用

2. **実行時パフォーマンス**
   - キャッシュによるネットワーク削減
   - リクエストのバッチング
   - 並列リクエストの最適化

3. **メモリ使用量**
   - キャッシュサイズの制限
   - リクエストキューの管理
   - 適切なクリーンアップ

### 10. セキュリティ考慮事項

1. **トークン管理**
   - アクセストークンの適切な保存
   - リフレッシュトークンの安全な管理
   - トークン漏洩の防止

2. **通信セキュリティ**
   - HTTPSの強制
   - CSRFトークンの管理（Web版）
   - Certificate Pinning（Mobile版）

3. **エラー情報**
   - センシティブ情報の除外
   - 適切なログレベル
   - プロダクション環境での制限

## 実装優先度

1. **高優先度**
   - HTTPAdapter
   - AuthAdapter
   - 基本的なエラーハンドリング

2. **中優先度**
   - EventAdapter統合
   - キャッシュ機能
   - リトライ機能

3. **低優先度**
   - 高度なキャッシュ戦略
   - リクエストバッチング
   - デバッグツール

## 成功指標

1. **コード重複の削減**: API通信ロジックの80%以上を共通化
2. **パフォーマンス維持**: 既存実装と比較して±5%以内
3. **テストカバレッジ**: 90%以上のカバレッジ
4. **開発効率**: 新規API連携の実装時間を50%削減
5. **エラー率**: ネットワークエラーの適切な処理により、クラッシュ率を30%削減

## リスクと対策

1. **リスク**: プラットフォーム固有の制約による実装困難
   - **対策**: 十分なAdapter層の設計と、段階的な移行

2. **リスク**: パフォーマンスの劣化
   - **対策**: ベンチマークテストの実施と、最適化の継続

3. **リスク**: 既存機能への影響
   - **対策**: Feature flagによる段階的な切り替えと、十分なテスト

## 参考資料

- [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)
- [Hono Client Documentation](https://hono.dev/guides/rpc)
- [React Native Networking](https://reactnative.dev/docs/network)
- [Web Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)