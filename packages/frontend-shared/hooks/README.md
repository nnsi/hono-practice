# Frontend Shared Hooks

このディレクトリには、WebアプリとReact Nativeアプリ間で共有されるカスタムフックが含まれています。

## 使用方法

各フックはプラットフォーム固有の実装をAdapter経由で抽象化しています。使用する際はプラットフォームに応じたAdapterを渡す必要があります。

## フック一覧

### createUseTimer

タイマー機能を提供するフックです。アクティビティの経過時間を計測し、複数のタイマーの同時実行を防ぎます。

#### 引数

```typescript
type UseTimerOptions = {
  activityId: string;
  storage: StorageAdapter;
  notification: NotificationAdapter;
  eventBus?: EventBusAdapter;
  timer?: TimerAdapter<unknown>;
};
```

#### 戻り値

```typescript
type UseTimerReturn = {
  isRunning: boolean;                    // タイマーが動作中かどうか
  elapsedTime: number;                   // 経過時間（ミリ秒）
  start: () => void;                     // タイマー開始
  stop: () => void;                      // タイマー停止
  reset: () => void;                     // タイマーリセット
  getFormattedTime: () => string;        // フォーマット済み時間（例：1:23:45）
  getElapsedSeconds: () => number;       // 経過秒数
  getStartTime: () => number | null;     // 開始時刻
};
```

#### 使用例

```typescript
// Web
import { createUseTimer } from '@packages/frontend-shared/hooks';
import { webStorageAdapter, webNotificationAdapter } from '@packages/frontend-shared/adapters';

const useTimer = createUseTimer({
  activityId: 'activity-123',
  storage: webStorageAdapter,
  notification: webNotificationAdapter,
});

// React Native
import { createUseTimer } from '@packages/frontend-shared/hooks';
import { mobileStorageAdapter, mobileNotificationAdapter } from '@packages/frontend-shared/adapters';

const useTimer = createUseTimer({
  activityId: 'activity-123',
  storage: mobileStorageAdapter,
  notification: mobileNotificationAdapter,
});
```

#### 特徴

- **永続化**: タイマーの状態はストレージに保存され、アプリを閉じても継続します
- **排他制御**: 複数のタイマーを同時に実行することはできません
- **イベント通知**: EventBus経由でタイマーのstart/stop/resetイベントを通知します
- **高精度**: 100msごとに更新されるため、正確な時間計測が可能です

### createUseNetworkStatus

ネットワーク接続状態を監視するフックです。

#### 引数

```typescript
type UseNetworkStatusOptions = {
  network: NetworkAdapter;
  notification?: NotificationAdapter;
};
```

#### 戻り値

```typescript
type UseNetworkStatusReturn = {
  isOnline: boolean;
  connectionType?: string;
};
```

### createUseGlobalDate

グローバルな日付管理を提供するフックです。

#### 引数

```typescript
type UseGlobalDateOptions = {
  storage?: StorageAdapter;
  eventBus?: EventBusAdapter;
};
```

#### 戻り値

```typescript
type UseGlobalDateReturn = {
  currentDate: Date;
  setDate: (date: Date) => void;
  resetToToday: () => void;
};
```

### createUseLongPress

長押しジェスチャーを検出するフックです。

#### 引数

```typescript
type UseLongPressOptions = {
  onLongPress: () => void;
  delay?: number; // デフォルト: 500ms
  threshold?: number; // 移動許容範囲（ピクセル）
};
```

#### 戻り値

```typescript
type UseLongPressReturn = {
  handlers: {
    onTouchStart?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    onMouseDown?: (e: MouseEvent) => void;
    onMouseUp?: (e: MouseEvent) => void;
    onMouseMove?: (e: MouseEvent) => void;
    onMouseLeave?: (e: MouseEvent) => void;
  };
  isPressed: boolean;
};
```

## テスト

各フックにはユニットテストが用意されています。

```bash
# 全てのテストを実行
npm run test-once -- packages/frontend-shared/hooks

# 特定のフックのテストを実行
npm run test-once -- packages/frontend-shared/hooks/useTimer.test.ts
```

## 注意事項

- フックを使用する際は、必ず適切なAdapterを渡してください
- プラットフォーム固有の処理はAdapter内に実装し、フック本体には含めないでください
- 新しいフックを追加する際は、必ずテストとドキュメントも追加してください