# 認証フローの共通化設計（実用的アプローチ）

## 概要
WebアプリとReact Nativeアプリ間で認証ロジックを段階的に共通化するための実用的な設計ドキュメント。**プラットフォーム固有の実装はそのまま維持し**、実際に重複しているビジネスロジックのみを効果的に共通化する。

## 現実的な現状分析

### 実際の重複コード（約100-150行）
1. **ユーザー状態管理ロジック**（約40行）
2. **初期化処理のフロー**（約30行）
3. **ログイン/ログアウトのビジネスロジック**（約30行）
4. **認証状態の型定義**（約20行）

### 共通化が困難な部分
- トークンの保存方法（Cookie vs AsyncStorage）
- リフレッシュトークンの送信方法
- イベント通知の仕組み
- プロバイダーの構造

## 設計方針

### 基本原則
1. **既存の実装を尊重し、最小限の変更に留める**
2. **プラットフォーム固有の部分は無理に共通化しない**
3. **型定義とビジネスロジックから共通化を始める**
4. **段階的な改善を前提とする**

## Phase 1: 最小限の共通化（3-4日）

### 1.1 共通型定義の整理（0.5日）

```typescript
// packages/frontend-shared/types/auth.ts

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
  email: string;
  nickname?: string;
  display_name?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
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
```

### 1.2 認証ヘルパー関数の抽出（1日）

```typescript
// packages/frontend-shared/auth/authHelpers.ts

// JWTトークンの有効期限を解析
export function parseTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // ミリ秒に変換
  } catch {
    // パースエラーの場合はデフォルト値
    return Date.now() + 15 * 60 * 1000; // 15分
  }
}

// トークンの有効性チェック
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  
  try {
    const expiry = parseTokenExpiry(token);
    // 1分の余裕を持たせる
    return expiry > Date.now() + 60 * 1000;
  } catch {
    return false;
  }
}

// 認証エラーの判定
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof Response) {
    return error.status === 401;
  }
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('unauthorized') ||
           error.message.toLowerCase().includes('認証');
  }
  return false;
}

// エラーメッセージの標準化
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Response) {
    switch (error.status) {
      case 401:
        return 'ログイン情報が無効です';
      case 403:
        return 'アクセスが拒否されました';
      default:
        return `エラーが発生しました (${error.status})`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '不明なエラーが発生しました';
}
```

### 1.3 共通ビジネスロジックの抽出（1.5日）

```typescript
// packages/frontend-shared/auth/authLogic.ts
import { apiClient } from "./apiClient"; // 各プラットフォームで設定済み

// ユーザー情報取得ロジック
export async function fetchCurrentUser(): Promise<User> {
  const response = await apiClient.user.me.$get();
  
  if (!response.ok) {
    throw new Error('ユーザー情報の取得に失敗しました');
  }
  
  return await response.json();
}

// ログインロジック（API呼び出しのみ）
export async function performLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const response = await apiClient.auth.login.$post({
    json: credentials,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'ログインに失敗しました');
  }
  
  return await response.json();
}

// ログアウトロジック（API呼び出しのみ）
export async function performLogout(): Promise<void> {
  try {
    await apiClient.auth.logout.$post();
  } catch {
    // ログアウトAPIのエラーは無視
    console.warn('Logout API failed, but continuing with local cleanup');
  }
}

// サインアップロジック（API呼び出しのみ）
export async function performSignup(
  userData: SignupData
): Promise<AuthResponse> {
  const response = await apiClient.user.$post({
    json: userData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'アカウント作成に失敗しました');
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
  options: InitAuthOptions
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
    console.error('Auth initialization failed:', error);
    return {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: error as Error,
    };
  }
}
```

### 1.4 既存コードへの統合

#### Web版の更新（最小限の変更）
```typescript
// apps/frontend/src/providers/AuthProvider.tsx
import { 
  AuthState, 
  LoginCredentials,
  getAuthErrorMessage 
} from "@frontend-shared/types/auth";
import {
  performLogin,
  performLogout,
  fetchCurrentUser,
  initializeAuth
} from "@frontend-shared/auth/authLogic";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  // 初期化処理（共通ロジックを使用）
  useEffect(() => {
    initializeAuth({
      hasStoredToken: !!tokenStore.getToken(),
      onTokenRefresh: async () => {
        // Web固有: Cookieベースのリフレッシュ
        const response = await apiClient.auth.token.$post();
        if (response.ok) {
          const data = await response.json();
          tokenStore.setToken(data.token);
          return data.token;
        }
        return null;
      },
      onUserFetch: fetchCurrentUser,
    }).then(setState);
  }, []);

  // ログイン処理（共通ロジックを使用）
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await performLogin(credentials);
      tokenStore.setToken(response.token);
      
      const user = response.user || await fetchCurrentUser();
      setState({
        isAuthenticated: true,
        user,
        isLoading: false,
      });
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: new Error(message)
      }));
      throw error;
    }
  }, []);

  // ログアウト処理（共通ロジックを使用）
  const logout = useCallback(async () => {
    await performLogout();
    tokenStore.clearToken();
    setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });
  }, []);

  // 既存のプロバイダー構造は維持
  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      <TokenProvider>
        {children}
      </TokenProvider>
    </AuthContext.Provider>
  );
};
```

#### Mobile版の更新（最小限の変更）
```typescript
// apps/mobile/src/contexts/AuthContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  AuthState,
  LoginCredentials,
  getAuthErrorMessage
} from "@frontend-shared/types/auth";
import {
  performLogin,
  performLogout,
  fetchCurrentUser,
  initializeAuth
} from "@frontend-shared/auth/authLogic";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  // 初期化処理（共通ロジックを使用）
  useEffect(() => {
    initializeAuth({
      hasStoredToken: false, // AsyncStorageから復元
      onTokenRefresh: async () => {
        // Mobile固有: AsyncStorageから復元
        const storedToken = await AsyncStorage.getItem('accessToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (storedToken && refreshToken) {
          tokenStore.setToken(storedToken);
          // 必要に応じてリフレッシュ
          return storedToken;
        }
        return null;
      },
      onUserFetch: fetchCurrentUser,
    }).then(setState);
  }, []);

  // ログイン処理（共通ロジックを使用）
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await performLogin(credentials);
      
      // Mobile固有: AsyncStorageに保存
      tokenStore.setToken(response.token);
      await AsyncStorage.setItem('accessToken', response.token);
      if (response.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.refreshToken);
      }
      
      const user = response.user || await fetchCurrentUser();
      setState({
        isAuthenticated: true,
        user,
        isLoading: false,
      });
      
      eventBus.emit('login', user);
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: new Error(message)
      }));
      throw error;
    }
  }, []);

  // ログアウト処理（共通ロジックを使用）
  const logout = useCallback(async () => {
    await performLogout();
    
    // Mobile固有: AsyncStorageをクリア
    tokenStore.clearToken();
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    
    setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });
    
    eventBus.emit('logout');
  }, []);

  // 既存のコンテキスト構造は維持
  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Phase 2: 効果測定と評価（1週間後）

### 測定項目
1. **コード削減量**: 実際に削減できた重複コード
2. **バグ発生率**: 共通化による新規バグの有無
3. **開発効率**: 新機能追加時の実装時間
4. **保守性**: 両プラットフォームでの変更の容易さ

### 評価基準
- コード削減: 50行以上（目標: 100行）
- バグ発生: 0件
- 開発効率: 変更なしまたは向上
- 保守性: レビュー時間の短縮

## Phase 3: 必要に応じた追加共通化（オプション）

Phase 1の効果が確認できた場合のみ検討：

### 候補
1. **トークン管理インターフェース**（必要性を再評価）
2. **認証イベントの標準化**（プラットフォーム差異を考慮）
3. **エラーリカバリーロジック**（共通パターンが見つかった場合）

## 成功指標（現実的な目標）

### 短期目標（1週間）
- 重複コードを30%削減（100行→70行）
- 既存機能への影響ゼロ
- 型定義の統一による開発体験向上
- エラーメッセージの一貫性向上

### 中期目標（1ヶ月）
- 認証関連の新機能実装時間20%削減
- 両プラットフォームでの認証フローの一貫性
- ドキュメント化による知識共有の向上

## リスクと対策

### リスク
1. **プラットフォーム固有の制約**
   - 対策: 共通化は最小限に留め、固有部分は維持

2. **既存機能への影響**
   - 対策: 段階的な移行、十分なテスト

3. **複雑性の増加**
   - 対策: シンプルな共通化のみ実施

## 実装スケジュール

### Day 1
- 共通型定義の作成とレビュー

### Day 2
- 認証ヘルパー関数の実装
- ユニットテストの作成

### Day 3
- 共通ビジネスロジックの抽出
- 既存コードへの統合（Web版）

### Day 4
- 既存コードへの統合（Mobile版）
- 統合テスト、動作確認

## まとめ

この設計は最小限の共通化から始め、実際の効果を測定しながら段階的に進める現実的なアプローチを採用している。プラットフォーム固有の実装は尊重し、本当に共通化すべき部分のみを対象とすることで、リスクを最小化しつつ、保守性と開発効率の向上を目指す。

**重要な原則**:
- プラットフォーム固有の部分は無理に共通化しない
- 既存の良い設計は維持する
- 測定可能な成果を重視する
- 段階的な改善を前提とする