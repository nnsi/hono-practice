# モバイルアプリの構造について

## 概要

ActikoのモバイルアプリはReact Native + Expoで開発されており、WebアプリケーションのコードベースからUIコンポーネントとビジネスロジックを移植しています。
Expo Routerによるファイルベースルーティングを採用し、Web版と同様の開発体験を提供しています。

## 技術スタック

### コアフレームワーク
- **React Native**: クロスプラットフォームモバイル開発
- **Expo SDK 51**: 開発ツールとランタイム
- **Expo Router**: ファイルベースルーティング
- **TypeScript**: 型安全な開発

### 状態管理・データフェッチ
- **Tanstack Query**: サーバー状態管理
- **React Context**: ローカル状態管理
- **Expo Secure Store**: 機密データの安全な保存

### UI・スタイリング
- **NativeWind**: Tailwind CSSベースのスタイリング
- **React Native Elements**: UIコンポーネントライブラリ
- **React Native Vector Icons**: アイコンライブラリ

### 開発ツール
- **Expo Dev Client**: カスタム開発クライアント
- **EAS Build**: クラウドビルドサービス
- **Biome**: リンター・フォーマッター

## ディレクトリ構造

```txt
apps/mobile/
├── app/                    # ルーティング定義（Expo Router）
│   ├── (app)/             # アプリメインレイアウト
│   │   ├── (tabs)/       # タブナビゲーション
│   │   │   ├── _layout.tsx
│   │   │   ├── daily.tsx    # 日次記録画面
│   │   │   ├── goal.tsx     # 目標設定画面
│   │   │   ├── index.tsx    # ホーム画面
│   │   │   ├── settings.tsx # 設定画面
│   │   │   └── stats.tsx    # 統計画面
│   │   └── _layout.tsx
│   ├── (auth)/            # 認証関連画面
│   │   ├── _layout.tsx
│   │   ├── index.tsx      # 認証メイン画面
│   │   ├── login.tsx      # ログイン画面
│   │   └── signup.tsx     # ユーザー登録画面
│   ├── _layout.tsx        # ルートレイアウト
│   └── index.tsx          # エントリーポイント
├── src/                   # ソースコード
│   ├── components/       # UIコンポーネント
│   │   ├── activity/    # 活動記録関連コンポーネント
│   │   ├── daily/       # 日次記録関連コンポーネント
│   │   └── goal/        # 目標設定関連コンポーネント
│   ├── contexts/         # Reactコンテキスト
│   ├── hooks/            # カスタムフック
│   ├── providers/        # プロバイダー
│   ├── screens/          # 画面コンポーネント
│   └── utils/            # ユーティリティ
├── global.css             # グローバルCSS（NativeWind）
├── tailwind.config.js    # Tailwind設定
├── app.json             # Expoアプリ設定
├── expo-env.d.ts        # Expo型定義
└── package.json         # 依存関係管理
```

## 主要機能の実装

### 1. 認証機能

#### トークン管理
- アクセストークン: メモリ内管理（AuthContext）
- リフレッシュトークン: Expo Secure Storeで安全に保存
- アプリ起動時の自動認証チェック

#### Google OAuth認証
- `expo-auth-session`を使用したOAuth実装
- WebブラウザでのGoogle認証フロー
- 認証後のディープリンク処理

### 2. オフライン対応

#### ローカルストレージ
- AsyncStorageによるデータ永続化
- Tanstack Queryのキャッシュ永続化
- オフライン時の操作キューイング

#### ネットワーク監視
- NetInfoによるネットワーク状態監視
- オンライン復帰時の自動同期
- 同期状態のUI表示

### 3. プラットフォーム固有機能

#### iOS/Android対応
- プラットフォーム別のUIコンポーネント
- ネイティブAPIの活用（カメラ、通知など）
- プラットフォーム固有のスタイリング

#### パフォーマンス最適化
- FlatListによる大量データの効率的表示
- 画像の遅延読み込み
- メモリ使用量の最適化

## Web版との共通化

### 共有コード
- `packages/types`: 型定義・DTOの共有
- `packages/frontend-shared`: ユーティリティ関数の共有
- ビジネスロジック（hooks）の共通化

### 差分管理
- UIコンポーネント: プラットフォーム別に実装
- ルーティング: Expo Router用に調整
- ストレージ: AsyncStorage/SecureStoreを使用

## ナビゲーション構造

### Tab Navigation
```
┌─────────────────────────────────┐
│          Today                  │  <- デフォルト画面
├─────────────────────────────────┤
│  Today │ Tasks │ Stats │ More  │  <- タブバー
└─────────────────────────────────┘
```

### Stack Navigation
- 各タブ内でスタックナビゲーション
- モーダル表示（新規作成、編集など）
- 戻るボタンの適切な処理

## セキュリティ考慮事項

### データ保護
- Expo Secure Storeによる機密情報の暗号化
- HTTPSによる通信の暗号化
- 生体認証によるアプリロック（検討中）

### 権限管理
- 必要最小限の権限要求
- 権限要求時の適切な説明表示
- 権限拒否時の代替フロー

## ビルド・デプロイ

### 開発ビルド
```bash
# 開発サーバー起動
npm run mobile-dev

# iOS開発ビルド
eas build --platform ios --profile development

# Android開発ビルド
eas build --platform android --profile development
```

### 本番ビルド
```bash
# iOS本番ビルド
eas build --platform ios --profile production

# Android本番ビルド
eas build --platform android --profile production
```

### アプリストア申請
- **iOS**: App Store Connect経由
- **Android**: Google Play Console経由
- EAS Submitによる自動申請も可能

## テスト戦略

### ユニットテスト
- Jestによるコンポーネントテスト
- React Native Testing Library
- カスタムフックのテスト

### E2Eテスト
- Maestroによる自動化テスト
- 主要フローのテストシナリオ
- クロスプラットフォームテスト

## パフォーマンス監視

### Sentryの活用
- クラッシュレポート
- パフォーマンス監視
- ユーザーセッション追跡

### アプリサイズ最適化
- 不要な依存関係の削除
- アセットの最適化
- コード分割（検討中）

## コンポーネントの作り方

### モバイル版コンポーネントの実装原則

Web版と同様に、**コンポーネントは純粋なプレゼンテーション層**、**カスタムフックにすべてのロジックを集約**する設計を採用しています。

#### React NativeとWebの違い

1. **UIコンポーネント**
   - Web: `<div>`, `<button>`, `<span>`など
   - Mobile: `<View>`, `<TouchableOpacity>`, `<Text>`など

2. **スタイリング**
   - Web: Tailwind CSS（className）
   - Mobile: NativeWind（className）+ StyleSheet

3. **イベント**
   - Web: `onClick`, `onChange`
   - Mobile: `onPress`, `onChangeText`

4. **ナビゲーション**
   - Web: Tanstack Router
   - Mobile: Expo Router

### 新規コンポーネント作成の手順

#### Step 1: カスタムフックの作成

`apps/mobile/src/hooks/feature/`にカスタムフックを作成します。可能な限り`packages/frontend-shared`の共通ロジックを活用します。

```typescript
// apps/mobile/src/hooks/feature/use{Feature}Page.ts
import { createUse{Feature}Page } from '@frontend-shared/hooks/feature/use{Feature}Page';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalDate } from '../useGlobalDate';
import { apiClient } from '@mobile/utils/apiClient';

export const use{Feature}Page = () => {
  const { selectedDate, setSelectedDate } = useGlobalDate();
  const queryClient = useQueryClient();
  
  // 共通ロジックを利用
  const sharedLogic = createUse{Feature}Page({
    dateStore: {
      date: selectedDate,
      setDate: setSelectedDate,
    },
    api: {
      getData: async () => {
        const response = await apiClient.feature.$get();
        return response.data;
      },
    },
    cache: {
      invalidateCache: async () => {
        await queryClient.invalidateQueries({ queryKey: ['feature'] });
      },
    },
  });
  
  // モバイル固有のロジック
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await sharedLogic.invalidateCache();
    setRefreshing(false);
  };
  
  return {
    ...sharedLogic,
    refreshing,
    handleRefresh,
  };
};
```

#### Step 2: UIコンポーネントの作成

`apps/mobile/src/components/{feature}/`にコンポーネントを作成します。

```typescript
// apps/mobile/src/components/{feature}/{Feature}Page.tsx
import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { use{Feature}Page } from '@mobile/hooks/feature/use{Feature}Page';

export function {Feature}Page() {
  const {
    data,
    isLoading,
    refreshing,
    handleRefresh,
    handleItemPress,
  } = use{Feature}Page();
  
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }
  
  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleItemPress(item)}
            className="bg-white mx-4 my-2 p-4 rounded-lg shadow-sm"
          >
            <Text className="text-lg font-semibold">{item.title}</Text>
            <Text className="text-gray-600 mt-1">{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

### コンポーネントパターン集

#### 1. カードコンポーネント

```typescript
// apps/mobile/src/components/activity/ActivityCard.tsx
import { TouchableOpacity, View, Text } from 'react-native';
import { ActivityIcon } from '../common/ActivityIcon';

type ActivityCardProps = {
  activity: Activity;
  onPress: () => void;
  onLongPress?: () => void;
  isDone?: boolean;
};

export function ActivityCard({
  activity,
  onPress,
  onLongPress,
  isDone = false,
}: ActivityCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className={`bg-white rounded-lg p-4 shadow-sm ${
        isDone ? 'bg-green-50' : ''
      }`}
      activeOpacity={0.7}
    >
      <View className="items-center">
        <ActivityIcon activity={activity} size="large" />
        <Text className="mt-2 text-center text-base font-medium">
          {activity.name}
        </Text>
        {activity.quantity && (
          <Text className="text-sm text-gray-500 mt-1">
            {activity.quantity} {activity.unit}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
```

#### 2. ダイアログ/モーダルコンポーネント

```typescript
// apps/mobile/src/components/{feature}/{Feature}Dialog.tsx
import { Modal, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { use{Feature}Dialog } from '@mobile/hooks/feature/use{Feature}Dialog';

type {Feature}DialogProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function {Feature}Dialog({
  visible,
  onClose,
  onSuccess,
}: {Feature}DialogProps) {
  const { formData, handleSubmit, handleChange } = use{Feature}Dialog(
    onClose,
    onSuccess
  );
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6">
          <Text className="text-xl font-bold mb-4">タイトル</Text>
          
          <TextInput
            value={formData.name}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="名前を入力"
            className="border border-gray-300 rounded-lg p-3 mb-4"
          />
          
          <View className="flex-row justify-end space-x-2">
            <TouchableOpacity
              onPress={onClose}
              className="px-6 py-3 rounded-lg bg-gray-200"
            >
              <Text>キャンセル</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleSubmit}
              className="px-6 py-3 rounded-lg bg-blue-500"
            >
              <Text className="text-white font-semibold">作成</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

#### 3. リストコンポーネント

```typescript
// apps/mobile/src/components/tasks/TaskList.tsx
import { FlatList, View, Text } from 'react-native';
import { TaskItem } from './TaskItem';
import { EmptyState } from './EmptyState';

type TaskListProps = {
  tasks: Task[];
  onTaskPress: (task: Task) => void;
  onTaskComplete: (task: Task) => void;
  isLoading?: boolean;
};

export function TaskList({
  tasks,
  onTaskPress,
  onTaskComplete,
  isLoading = false,
}: TaskListProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  if (tasks.length === 0) {
    return <EmptyState message="タスクがありません" />;
  }
  
  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View className="h-2" />}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <TaskItem
          task={item}
          onPress={() => onTaskPress(item)}
          onComplete={() => onTaskComplete(item)}
        />
      )}
    />
  );
}
```

### モバイル固有の実装パターン

#### 1. Pull to Refreshの実装

```typescript
export function DailyPage() {
  const { data, refreshing, handleRefresh } = useDailyPage();
  
  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#3B82F6']} // Android
          tintColor="#3B82F6"  // iOS
        />
      }
    >
      {/* コンテンツ */}
    </ScrollView>
  );
}
```

#### 2. タブ切り替えの実装

```typescript
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const Tab = createMaterialTopTabNavigator();

export function StatsScreen() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Daily" component={DailyStats} />
      <Tab.Screen name="Weekly" component={WeeklyStats} />
      <Tab.Screen name="Monthly" component={MonthlyStats} />
    </Tab.Navigator>
  );
}
```

#### 3. ジェスチャー操作

```typescript
import { Swipeable } from 'react-native-gesture-handler';

export function SwipeableTaskItem({ task, onDelete }) {
  const renderRightActions = () => (
    <TouchableOpacity
      onPress={() => onDelete(task)}
      className="bg-red-500 justify-center px-6"
    >
      <Text className="text-white">削除</Text>
    </TouchableOpacity>
  );
  
  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View className="bg-white p-4">
        <Text>{task.title}</Text>
      </View>
    </Swipeable>
  );
}
```

### プラットフォーム別の処理

```typescript
import { Platform } from 'react-native';

export function PlatformSpecificComponent() {
  return (
    <View
      style={{
        paddingTop: Platform.OS === 'ios' ? 20 : 0,
        elevation: Platform.OS === 'android' ? 4 : 0,
        shadowOpacity: Platform.OS === 'ios' ? 0.2 : 0,
      }}
    >
      <Text>
        {Platform.select({
          ios: 'iOS向けテキスト',
          android: 'Android向けテキスト',
        })}
      </Text>
    </View>
  );
}
```

### パフォーマンス最適化

#### 1. FlatListの最適化

```typescript
<FlatList
  data={largeDataSet}
  keyExtractor={(item) => item.id}
  // パフォーマンス最適化
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  windowSize={10}
  initialNumToRender={10}
  // メモリ最適化
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

#### 2. 画像の最適化

```typescript
import { Image } from 'expo-image';

export function OptimizedImage({ source, style }) {
  return (
    <Image
      source={source}
      style={style}
      placeholder={blurhash}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk" // キャッシュ戦略
    />
  );
}
```

### テスト戦略

#### カスタムフックのテスト

```typescript
// apps/mobile/src/hooks/feature/test/use{Feature}Page.test.tsx
import { renderHook, act } from '@testing-library/react-native';
import { use{Feature}Page } from '../use{Feature}Page';

describe('use{Feature}Page', () => {
  it('should handle refresh', async () => {
    const { result } = renderHook(() => use{Feature}Page());
    
    expect(result.current.refreshing).toBe(false);
    
    await act(async () => {
      await result.current.handleRefresh();
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

### ファイル構成

```
apps/mobile/
├── app/                          # Expo Routerのルーティング
│   └── (app)/
│       └── (tabs)/
│           └── feature.tsx      # 画面ファイル
├── src/
│   ├── components/
│   │   └── feature/
│   │       ├── FeaturePage.tsx  # ページコンポーネント
│   │       ├── FeatureCard.tsx  # カードコンポーネント
│   │       └── FeatureDialog.tsx # ダイアログコンポーネント
│   └── hooks/
│       └── feature/
│           ├── useFeaturePage.ts
│           └── useFeatureDialog.ts
```
