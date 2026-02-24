# API通信層の共通化設計（実用的アプローチ）

## 概要
WebアプリとReact Nativeアプリ間でAPI通信ロジックを段階的に共通化するための実用的な設計ドキュメント。**Hono Clientの型安全性を維持しながら**、実際に重複しているコードのみを効果的に共通化する。

## 現実的な現状分析

### 実際の重複コード（約150-200行）
1. **トークンリフレッシュロジック**（約60行）
2. **エラーハンドリング**（約40行）
3. **リトライロジック**（約30行）
4. **ネットワークエラー判定**（約20行）

### 重複していないコード
- トークン管理方法（Cookie vs AsyncStorage）
- 認証ヘッダーの設定方法
- イベント通知の実装
- プラットフォーム固有の設定

## 設計方針

### 基本原則
1. **Hono Clientの型安全性を維持**
2. **最小限の共通化から始める**
3. **既存コードへの影響を最小化**
4. **段階的な改善を前提とする**

## Phase 1: 最小限の共通化（1週間）

### 1.1 エラーハンドリングの共通化（1-2日）

#### 共通エラー型定義
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
```

#### エラーハンドラー
```typescript
// packages/frontend-shared/api/errorHandler.ts
export async function handleApiError(
  error: unknown,
  platform: 'web' | 'mobile'
): Promise<APIError> {
  // ネットワークエラーの判定
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError('ネットワークエラーが発生しました', error);
  }
  
  // Responseオブジェクトの場合
  if (error instanceof Response) {
    try {
      const data = await error.json();
      
      if (error.status === 401) {
        return new AuthError(data.message || '認証エラー', data);
      }
      
      return new APIError(
        data.message || `HTTPエラー: ${error.status}`,
        error.status,
        data.code,
        data
      );
    } catch {
      return new APIError(`HTTPエラー: ${error.status}`, error.status);
    }
  }
  
  // その他のエラー
  if (error instanceof Error) {
    return new APIError(error.message, 500, 'UNKNOWN_ERROR');
  }
  
  return new APIError('不明なエラーが発生しました', 500, 'UNKNOWN_ERROR');
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError ||
    (error instanceof TypeError && error.message.includes('fetch'));
}

export function isAuthError(error: unknown): boolean {
  return error instanceof AuthError ||
    (error instanceof APIError && error.statusCode === 401);
}
```

### 1.2 トークンリフレッシュロジックの抽出（2-3日）

#### 共通インターフェース
```typescript
// packages/frontend-shared/api/tokenRefresh.ts
export type TokenRefreshOptions = {
  getRefreshToken: () => Promise<string | null>;
  refreshEndpoint: string;
  platform: 'web' | 'mobile';
  onSuccess: (token: string, refreshToken?: string) => Promise<void>;
  onFailure: () => Promise<void>;
};

// リフレッシュキューの管理
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

export async function createTokenRefreshHandler(options: TokenRefreshOptions) {
  const { getRefreshToken, refreshEndpoint, platform, onSuccess, onFailure } = options;
  
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (platform === 'web') {
        // Web: Cookieベース
        requestInit.credentials = 'include';
      } else {
        // Mobile: Bearerトークン
        if (!refreshToken) {
          throw new Error('リフレッシュトークンがありません');
        }
        requestInit.headers = {
          ...requestInit.headers,
          'Authorization': `Bearer ${refreshToken}`,
        };
        requestInit.credentials = 'omit';
      }
      
      const response = await fetch(refreshEndpoint, requestInit);
      
      if (!response.ok) {
        throw new Error('トークンリフレッシュに失敗しました');
      }
      
      const data = await response.json();
      const newToken = data.token;
      
      // 成功コールバック
      await onSuccess(newToken, data.refreshToken);
      
      // キューの処理
      refreshQueue.forEach(resolve => resolve(newToken));
      refreshQueue = [];
      
      return newToken;
      
    } catch (error) {
      // 失敗コールバック
      await onFailure();
      
      // キューの処理
      refreshQueue.forEach(resolve => resolve(null));
      refreshQueue = [];
      
      throw error;
    } finally {
      isRefreshing = false;
    }
  };
}
```

### 1.3 共通型定義の整理（1日）

```typescript
// packages/frontend-shared/types/api.ts
export type ApiConfig = {
  baseUrl: string;
  platform: 'web' | 'mobile';
};

export type RequestContext = {
  isAuthEndpoint: boolean;
  requiresAuth: boolean;
};

// packages/frontend-shared/types/auth.ts
export type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error?: Error;
};

export type LoginCredentials = {
  login_id: string;
  password: string;
};
```

### 1.4 既存コードへの統合

#### Web版の更新
```typescript
// apps/frontend/src/utils/apiClient.ts
import { hc } from "hono/client";
import { handleApiError, isAuthError } from "@frontend-shared/api/errorHandler";
import { createTokenRefreshHandler } from "@frontend-shared/api/tokenRefresh";
import { tokenStore } from "./tokenStore";

// トークンリフレッシュハンドラーの作成
const refreshToken = createTokenRefreshHandler({
  getRefreshToken: async () => null, // Cookieベースなので不要
  refreshEndpoint: `${import.meta.env.VITE_API_URL}/auth/token`,
  platform: 'web',
  onSuccess: async (token) => {
    tokenStore.setToken(token);
  },
  onFailure: async () => {
    tokenStore.clearToken();
    window.dispatchEvent(new CustomEvent("unauthorize"));
  },
});

// 既存のcustomFetchを最小限の変更で更新
const customFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  try {
    const response = await originalFetch(input, init);
    
    if (response.status === 401 && !isAuthEndpoint(input)) {
      try {
        const newToken = await refreshToken();
        if (newToken) {
          // リトライ
          return originalFetch(input, init);
        }
      } catch {
        // リフレッシュ失敗
      }
    }
    
    if (!response.ok) {
      const error = await handleApiError(response, 'web');
      throw error;
    }
    
    return response;
  } catch (error) {
    const apiError = await handleApiError(error, 'web');
    throw apiError;
  }
};

// Hono Clientはそのまま維持（型安全性を保つ）
export const apiClient = hc<AppType>(
  import.meta.env.VITE_API_URL || "http://localhost:3456",
  {
    fetch: customFetch,
  }
);
```

#### Mobile版の更新
```typescript
// apps/mobile/src/utils/apiClient.ts
import { hc } from "hono/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { handleApiError, isAuthError } from "@frontend-shared/api/errorHandler";
import { createTokenRefreshHandler } from "@frontend-shared/api/tokenRefresh";
import { tokenStore } from "./tokenStore";
import { eventBus } from "./eventBus";

// トークンリフレッシュハンドラーの作成
const refreshToken = createTokenRefreshHandler({
  getRefreshToken: async () => AsyncStorage.getItem('refreshToken'),
  refreshEndpoint: `${API_URL}/auth/token`,
  platform: 'mobile',
  onSuccess: async (token, refreshToken) => {
    tokenStore.setToken(token);
    await AsyncStorage.setItem('accessToken', token);
    if (refreshToken) {
      await AsyncStorage.setItem('refreshToken', refreshToken);
    }
  },
  onFailure: async () => {
    tokenStore.clearToken();
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    eventBus.emit('unauthorize');
  },
});

// 既存のcustomFetchを最小限の変更で更新
const customFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  try {
    const response = await fetch(input, {
      ...init,
      credentials: 'omit', // React Nativeの制約
    });
    
    if (response.status === 401 && !isAuthEndpoint(input)) {
      try {
        const newToken = await refreshToken();
        if (newToken) {
          // リトライ
          return fetch(input, {
            ...init,
            credentials: 'omit',
          });
        }
      } catch {
        // リフレッシュ失敗
      }
    }
    
    if (!response.ok) {
      const error = await handleApiError(response, 'mobile');
      throw error;
    }
    
    return response;
  } catch (error) {
    const apiError = await handleApiError(error, 'mobile');
    throw apiError;
  }
};

// Hono Clientはそのまま維持（型安全性を保つ）
export const apiClient = hc<AppType>(API_URL, {
  fetch: customFetch,
});
```

## Phase 2: 効果測定と次のステップ（1週間後）

### 測定項目
1. **コード削減量**: 実際に削減できたコード行数
2. **バグ発生率**: 新規バグの発生有無
3. **開発速度**: 新機能実装時の時間
4. **保守性**: コードレビューの時間

### 次のステップの検討
Phase 1の効果が確認できた場合のみ、以下を検討：
- リトライロジックの共通化
- ネットワーク状態管理の共通化
- より高度なエラーハンドリング

## Phase 3: 必要に応じた拡張（オプション）

### 検討事項
1. **リトライ機能**（必要性を評価後）
2. **オフライン対応**（要件が明確になった時点で）
3. **キャッシュ機能**（パフォーマンス要件が確定後）

## 成功指標（現実的な目標）

### 短期目標（1週間）
- 重複コードを50%削減（150行→75行）
- 新規バグの発生ゼロ
- 既存の開発速度を維持
- Hono Clientの型安全性を100%維持

### 中期目標（1ヶ月）
- エラーハンドリングの一貫性向上
- トークンリフレッシュの信頼性向上
- コードレビュー時間の20%短縮

## リスクと対策

### リスク
1. **既存機能への影響**
   - 対策: 最小限の変更に留める、十分なテスト

2. **型安全性の損失**
   - 対策: Hono Clientをそのまま使用、共通化は補助的な部分のみ

3. **プラットフォーム固有の問題**
   - 対策: プラットフォーム別の処理は明確に分離

## 実装スケジュール

### Week 1
- Day 1-2: エラーハンドリングの共通化
- Day 3-4: トークンリフレッシュロジックの抽出
- Day 5: 共通型定義の整理、テスト

### Week 2
- 効果測定
- フィードバックの収集
- 次のステップの計画

## まとめ

この設計は「完璧な抽象化」ではなく「適切な抽象化」を目指している。実際に重複しているコードのみを対象とし、Hono Clientの利点を活かしながら、段階的に改善を進めることで、リスクを最小化しつつ効果を最大化する。

**重要**: 
- 過度な抽象化は避ける
- 型安全性を犠牲にしない
- 段階的な改善を前提とする
- 測定可能な成果を重視する