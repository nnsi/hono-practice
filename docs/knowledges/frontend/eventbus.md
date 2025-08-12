# EventBus アーキテクチャ

## 概要

EventBusは、Actikoアプリケーション内でコンポーネント間の疎結合な通信を実現するためのイベント駆動型メッセージングシステムです。Pub/Subパターンを実装し、グローバルなイベントの発火と購読を可能にします。

## アーキテクチャ

### レイヤー構造

```
┌─────────────────────────────────────┐
│     React Components                 │
│  (useEventBus, useGlobalDate, etc)  │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│     EventBusProvider                 │
│   (React Context Provider)           │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│     EventBusAdapter                  │
│  (Frontend-shared abstraction)       │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│       EventBus Core                  │
│  (Window Events / In-Memory)         │
└─────────────────────────────────────┘
```

### 主要コンポーネント

#### 1. EventBus Core (`apps/frontend/src/services/abstractions/EventBus.ts`)

EventBusの中核となるインターフェースと実装を提供。

```typescript
export type EventBus = {
  emit: (eventName: string, detail?: any) => void;
  on: (eventName: string, listener: (event: CustomEvent) => void) => () => void;
  once: (eventName: string, listener: (event: CustomEvent) => void) => () => void;
  removeAllListeners: (eventName?: string) => void;
};
```

**実装:**
- `createWindowEventBus()`: 本番環境用。window.dispatchEvent/addEventListenerを使用
- `createInMemoryEventBus()`: テスト用。メモリ内でイベントを管理

#### 2. EventBusAdapter (`packages/frontend-shared/adapters/types.ts`)

フロントエンド共通レイヤーで使用される簡略化されたインターフェース。

```typescript
export type EventBusAdapter = {
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (data?: unknown) => void) => () => void;
  off: (event: string, handler: (data?: unknown) => void) => void;
};
```

**アダプター実装:**
- `createEventBusAdapter(eventBus)`: EventBusをEventBusAdapterに変換
- `createWebEventBusAdapter()`: スタンドアロンのWebアダプター実装
- `createReactNativeEventBusAdapter()`: React Native用（現在はWebと同じ）

#### 3. EventBusProvider (`apps/frontend/src/providers/EventBusProvider.tsx`)

React Context APIを使用してEventBusインスタンスをコンポーネントツリー全体で共有。

```typescript
export const useEventBus = () => {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error("useEventBus must be used within an EventBusProvider");
  }
  return context.eventBus;
};
```

## 定義済みイベント

`AppEvents`定数で標準イベント名を定義：

```typescript
export const AppEvents = {
  // 認証関連
  TOKEN_REFRESH_NEEDED: "token-refresh-needed",
  TOKEN_REFRESHED: "token-refreshed",
  UNAUTHORIZED: "unauthorized",
  
  // データ同期関連
  OFFLINE_DATA_UPDATED: "offline-data-updated",
  SYNC_DELETE_SUCCESS: "sync-delete-success",
  SYNC_CREATE_SUCCESS: "sync-create-success",
  SYNC_UPDATE_SUCCESS: "sync-update-success",
  SYNC_OPERATION: "sync-operation",
  SYNC_SUCCESS: "sync-success",
  SYNC_ERROR: "sync-error",
  
  // API関連
  API_ERROR: "api-error",
  
  // ネットワーク関連
  ONLINE: "online",
  OFFLINE: "offline",
  
  // ストレージ関連
  STORAGE: "storage",
} as const;
```

## 使用方法

### 基本的な使い方

#### 1. EventBusProviderの設定

アプリケーションのルートで設定（通常は自動設定済み）：

```tsx
// main.tsx
const eventBus = createWindowEventBus();

root.render(
  <EventBusProvider eventBus={eventBus}>
    <App />
  </EventBusProvider>
);
```

#### 2. コンポーネントでの使用

```tsx
import { useEventBus } from "@frontend/providers/EventBusProvider";
import { AppEvents } from "@frontend/services/abstractions";

function MyComponent() {
  const eventBus = useEventBus();
  
  // イベントの発火
  const handleClick = () => {
    eventBus.emit(AppEvents.API_ERROR, { 
      message: "エラーが発生しました" 
    });
  };
  
  // イベントの購読
  useEffect(() => {
    const unsubscribe = eventBus.on(AppEvents.API_ERROR, (event) => {
      console.log("エラー:", event.detail.message);
    });
    
    return unsubscribe; // クリーンアップ
  }, [eventBus]);
  
  return <button onClick={handleClick}>エラー発火</button>;
}
```

### 実践的な使用例

#### 1. グローバル日付管理 (`useGlobalDate`)

複数のコンポーネント間で選択日付を同期：

```tsx
export const useGlobalDate = () => {
  const eventBus = useEventBus();
  const eventBusAdapter = createEventBusAdapter(eventBus);
  
  // 日付変更をブロードキャスト
  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateState(date);
    eventBusAdapter.emit("globalDate:changed", { 
      date: date.toISOString() 
    });
  }, [eventBusAdapter]);
  
  // 他のコンポーネントからの日付変更を受信
  useEffect(() => {
    const unsubscribe = eventBusAdapter.on("globalDate:changed", (data) => {
      const newDate = new Date(data.date);
      setSelectedDateState(newDate);
    });
    return unsubscribe;
  }, [eventBusAdapter]);
};
```

#### 2. タイマー管理 (`useTimer`)

```tsx
// タイマー完了イベントの発火
eventBusAdapter.emit("timer:completed", {
  activityId,
  elapsedSeconds
});

// タイマーリセットイベントの購読
eventBusAdapter.on("timer:reset", () => {
  resetTimer();
});
```

#### 3. 認証エラーハンドリング

```tsx
// APIクライアントで401エラーを検知
if (response.status === 401) {
  eventBus.emit(AppEvents.UNAUTHORIZED);
}

// 認証プロバイダーでログアウト処理
eventBus.on(AppEvents.UNAUTHORIZED, () => {
  logout();
  navigate("/login");
});
```

## カスタムイベントの作成

新しいイベントタイプを追加する場合：

```typescript
// 1. イベント名を定義
const MyCustomEvents = {
  USER_PROFILE_UPDATED: "user-profile-updated",
  NOTIFICATION_RECEIVED: "notification-received",
} as const;

// 2. 型安全な使用（オプション）
type UserProfileEvent = {
  userId: string;
  updates: Partial<UserProfile>;
};

// 3. 発火
eventBus.emit(MyCustomEvents.USER_PROFILE_UPDATED, {
  userId: "123",
  updates: { name: "新しい名前" }
} as UserProfileEvent);

// 4. 購読
eventBus.on(MyCustomEvents.USER_PROFILE_UPDATED, (event) => {
  const data = event.detail as UserProfileEvent;
  updateUserProfile(data.userId, data.updates);
});
```

## テスト

### インメモリEventBusの使用

テストではwindowオブジェクトに依存しないインメモリ実装を使用：

```tsx
import { createInMemoryEventBus } from "@frontend/services/abstractions";
import { EventBusProvider } from "@frontend/providers/EventBusProvider";

describe("MyComponent", () => {
  it("イベントを正しく処理する", () => {
    const eventBus = createInMemoryEventBus();
    
    render(
      <EventBusProvider eventBus={eventBus}>
        <MyComponent />
      </EventBusProvider>
    );
    
    // テスト実装...
  });
});
```

### モックEventBusAdapter

```typescript
const createMockEventBusAdapter = (): EventBusAdapter => ({
  emit: vi.fn(),
  on: vi.fn(() => vi.fn()), // unsubscribe関数を返す
  off: vi.fn(),
});

// 使用例
const eventBus = createMockEventBusAdapter();
expect(eventBus.emit).toHaveBeenCalledWith("globalDate:changed", {
  date: "2024-01-01T00:00:00.000Z"
});
```

## ベストプラクティス

### 1. イベント名の命名規則

- 名前空間を使用: `feature:action` (例: `timer:completed`, `auth:logout`)
- 定数として定義してタイポを防ぐ
- 過去形で状態変更を表現: `created`, `updated`, `deleted`

### 2. メモリリーク対策

```tsx
// ❌ 悪い例: unsubscribeを忘れている
useEffect(() => {
  eventBus.on("my-event", handler);
}, []);

// ✅ 良い例: クリーンアップ関数でunsubscribe
useEffect(() => {
  const unsubscribe = eventBus.on("my-event", handler);
  return unsubscribe;
}, [eventBus]);
```

### 3. イベントデータの構造化

```typescript
// ❌ 悪い例: プリミティブ値を直接渡す
eventBus.emit("user-updated", userId);

// ✅ 良い例: オブジェクトで構造化
eventBus.emit("user-updated", {
  userId,
  timestamp: new Date().toISOString(),
  updatedFields: ["name", "email"]
});
```

### 4. エラーハンドリング

```typescript
eventBus.on("my-event", (event) => {
  try {
    processEvent(event.detail);
  } catch (error) {
    console.error("イベント処理エラー:", error);
    // 必要に応じてエラーイベントを発火
    eventBus.emit(AppEvents.API_ERROR, { error });
  }
});
```

### 5. 型安全性の確保

```typescript
// イベントペイロードの型定義
type EventPayloads = {
  "timer:completed": { activityId: string; seconds: number };
  "auth:logout": { reason?: string };
};

// 型安全なEventBusラッパー
class TypedEventBus<T extends Record<string, any>> {
  constructor(private eventBus: EventBus) {}
  
  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.eventBus.emit(event as string, data);
  }
  
  on<K extends keyof T>(
    event: K,
    handler: (data: T[K]) => void
  ): () => void {
    return this.eventBus.on(event as string, (e) => 
      handler(e.detail)
    );
  }
}
```

## トラブルシューティング

### よくある問題

#### 1. イベントが受信されない

- EventBusProviderでラップされているか確認
- イベント名のタイポを確認
- 購読タイミングを確認（イベント発火前に購読されているか）

#### 2. メモリリーク

- useEffectのクリーンアップ関数でunsubscribeしているか確認
- removeAllListenersを適切に使用しているか確認

#### 3. テストでイベントが機能しない

- createInMemoryEventBusを使用しているか確認
- EventBusProviderでテスト対象をラップしているか確認

## まとめ

EventBusは、Actikoアプリケーション内でのコンポーネント間通信を簡潔かつ効率的に実現する重要な基盤です。適切に使用することで、疎結合でメンテナンスしやすいコードベースを維持できます。