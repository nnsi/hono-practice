# Platform Adapters

プラットフォーム固有のAPIを抽象化し、WebとReact Nativeアプリ間でビジネスロジックを共有可能にするアダプター層です。

## 概要

Platform Adaptersは、以下のプラットフォーム固有機能を統一されたインターフェースで提供します：

- **Storage**: データの永続化（Web: localStorage、React Native: AsyncStorage）
- **Network**: ネットワーク状態の監視
- **Notification**: ユーザー通知（toast、alert、confirm）
- **EventBus**: コンポーネント間通信
- **Timer**: タイマー機能

## 使用方法

### Web環境での使用

```typescript
import {
  WebStorageAdapter,
  WebNetworkAdapter,
  WebNotificationAdapter,
  WebEventBusAdapter,
  WebTimerAdapter,
} from "@packages/frontend-shared/adapters";

// Storage
const storage = new WebStorageAdapter();
await storage.setItem("key", "value");
const value = await storage.getItem("key");

// Network
const network = new WebNetworkAdapter();
const isOnline = network.isOnline();
const unsubscribe = network.addListener((online) => {
  console.log("Network status:", online);
});

// Notification
const notification = new WebNotificationAdapter();
notification.toast({ title: "Success", description: "Operation completed" });
await notification.alert("Alert", "This is an alert");
const confirmed = await notification.confirm("Confirm", "Are you sure?");

// EventBus
const eventBus = new WebEventBusAdapter();
eventBus.on("event", (data) => console.log(data));
eventBus.emit("event", { message: "Hello" });

// Timer
const timer = new WebTimerAdapter();
const id = timer.setInterval(() => console.log("tick"), 1000);
timer.clearInterval(id);
```

### React Native環境での使用

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { Alert } from "react-native";

import {
  ReactNativeStorageAdapter,
  ReactNativeNetworkAdapter,
  ReactNativeNotificationAdapter,
  ReactNativeEventBusAdapter,
  ReactNativeTimerAdapter,
} from "@packages/frontend-shared/adapters";

// Storage
const storage = new ReactNativeStorageAdapter(AsyncStorage);

// Network
const network = new ReactNativeNetworkAdapter(NetInfo);

// Notification
const notification = new ReactNativeNotificationAdapter(Alert);

// EventBus
const eventBus = new ReactNativeEventBusAdapter();

// Timer
const timer = new ReactNativeTimerAdapter();
```

## 共通Hooksでの利用例

```typescript
import type { StorageAdapter, NetworkAdapter } from "@packages/frontend-shared/adapters";

export function createUsePersistedState<T>(
  key: string,
  defaultValue: T,
  storage: StorageAdapter,
) {
  const [state, setState] = useState<T>(defaultValue);

  useEffect(() => {
    storage.getItem(key).then((value) => {
      if (value) {
        setState(JSON.parse(value));
      }
    });
  }, [key]);

  const setPersistentState = useCallback(
    (newValue: T) => {
      setState(newValue);
      storage.setItem(key, JSON.stringify(newValue));
    },
    [key, storage],
  );

  return [state, setPersistentState] as const;
}
```

## 型定義

### StorageAdapter

```typescript
type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
};
```

### NetworkAdapter

```typescript
type NetworkAdapter = {
  isOnline: () => boolean;
  addListener: (callback: (isOnline: boolean) => void) => () => void;
};
```

### NotificationAdapter

```typescript
type NotificationAdapter = {
  toast: (options: ToastOptions) => void;
  alert: (title: string, message?: string) => Promise<void>;
  confirm: (title: string, message?: string) => Promise<boolean>;
};
```

### EventBusAdapter

```typescript
type EventBusAdapter = {
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (data?: unknown) => void) => () => void;
  off: (event: string, handler: (data?: unknown) => void) => void;
};
```

### TimerAdapter

```typescript
type TimerAdapter<T = unknown> = {
  setInterval: (callback: () => void, ms: number) => T;
  clearInterval: (id: T) => void;
};
```

## テスト

すべてのアダプターには包括的なユニットテストが含まれています：

```bash
npm run test-once -- packages/frontend-shared/adapters/
```

## 注意事項

- React Native環境では、プラットフォーム固有の依存関係（AsyncStorage、NetInfoなど）は利用側で注入する必要があります
- Web環境のNotificationAdapterでtoast機能を使用する場合は、`setToastCallback`でUIライブラリのtoast関数を設定してください
- エラーハンドリングは各アダプター内で行われ、適切なフォールバック動作が実装されています