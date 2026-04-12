# WebアプリとMobileアプリのHooks共通化可能性レポート

## 概要
このレポートは、WebアプリとMobileアプリで重複しているHooksの共通化可能性について調査した結果をまとめたものです。

## 共通化済みのHooks

### 1. useActivities ✅
- **状態**: プロトタイプ実装完了
- **共通化方法**: `createUseActivities`として実装
- **特徴**: 
  - apiClientを引数として受け取る設計
  - dateパラメータによる条件分岐サポート
  - WebとMobile両方の要件を満たす

### 2. useTimer ✅
- **状態**: 既に共通化済み
- **共通化方法**: `createUseTimer`として実装
- **特徴**: Platform Adaptersを使用

### 3. useNetworkStatus ✅
- **状態**: 既に共通化済み
- **共通化方法**: `createUseNetworkStatus`として実装
- **特徴**: Network Adapterを使用

### 4. useGlobalDate ✅
- **状態**: 既に共通化済み
- **共通化方法**: `createUseGlobalDate`として実装

### 5. useLongPress ✅
- **状態**: 既に共通化済み
- **共通化方法**: `createUseLongPress`として実装

## 共通化候補のHooks

### 1. useAuth 🔄
- **現状**: WebとMobileで別々に実装
- **共通化可能性**: **高**
- **推奨アプローチ**:
  ```typescript
  export function createUseAuth(options: {
    apiClient: ApiClient;
    storage: StorageAdapter;
    eventBus?: EventBusAdapter;
  }): UseAuthReturn
  ```
- **課題**:
  - トークン管理の抽象化が必要
  - プラットフォーム固有の認証フロー（Google OAuth等）の対応

### 2. useAppSettings 🔄
- **現状**: Mobileのみに存在（Webにも類似のuseAppSettingsあり）
- **共通化可能性**: **高**
- **推奨アプローチ**:
  ```typescript
  export function createUseAppSettings(options: {
    storage: StorageAdapter;
  }): UseAppSettingsReturn
  ```

## 共通化が困難なHooks

### 1. プラットフォーム固有のHooks
以下のHooksはプラットフォーム固有の機能に依存しているため、共通化は困難：

#### Web固有:
- `useLogin` - Web固有のログインフロー
- `useAuthInitializer` - Web固有の認証初期化
- `useCreateUser` - Web固有のユーザー作成フロー

#### Mobile固有:
- `useSyncStatus` - オフライン同期機能
- `useSubscription` - プッシュ通知等のサブスクリプション
- `useTaskActions` - モバイル固有のタスク操作
- `useTasks` - モバイル固有のタスク管理

## 共通化パターンの推奨事項

### 1. ファクトリ関数パターン
```typescript
export function createUseXXX(options: UseXXXOptions): UseXXXReturn {
  // 共通ロジック
}
```

### 2. Adapter パターンの活用
- プラットフォーム固有の実装はAdapterで抽象化
- Storage、Network、Notification等の既存Adapterを活用

### 3. API通信の共通化
- apiClientを引数として受け取る
- エラーハンドリングの統一

### 4. 型の共通化
- `@dtos/*`の型定義を活用
- 戻り値の型を明確に定義

## 次のステップ

1. **useAuthの共通化**（優先度: 高）
   - 認証フローの抽象化設計
   - トークン管理の統一
   - セキュリティ要件の確認

2. **useAppSettingsの共通化**（優先度: 中）
   - 設定項目の統一
   - StorageAdapterの活用

3. **API関連Hooksの共通化基盤構築**
   - HTTPクライアントの抽象化
   - エラーハンドリングの統一
   - キャッシュ戦略の設計

## まとめ

共通化により、以下のメリットが期待できます：
- コード重複の削減（推定40-50%）
- 保守性の向上
- バグ修正の一元化
- 新機能追加の効率化

一方で、過度な抽象化は避け、プラットフォーム固有の機能は適切に分離することが重要です。