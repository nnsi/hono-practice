# フロントエンドテスト戦略とタスクリスト

## テスト戦略概要

### 基本方針
- **段階的導入**: 重要度の高い部分から順次テストを追加
- **依存性注入**: グローバル依存を抽象化し、テスト可能な設計に改善
- **モック優先**: 外部依存はモックで置き換え、単体テストを高速化
- **実装とテストの並行開発**: リファクタリングとテスト追加を同時進行

### テストレベル
1. **ユニットテスト**: hooks、utils、純粋関数
2. **統合テスト**: Provider、Context統合、API連携
3. **E2Eテスト**: 認証フロー、CRUD操作、オフライン動作

## タスクリスト

### 1. テスト環境のセットアップ

- [x] Vitestのフロントエンド用設定を追加（`apps/frontend/vitest.config.ts`）
- [x] jsdom環境の設定
- [x] MSW（Mock Service Worker）のインストールと設定
- [x] テスト用setupファイルの作成（`apps/frontend/test.setup.ts`）

### 2. 依存性の抽象化とリファクタリング

#### 2.1 グローバル依存の抽象化
- [x] StorageProvider インターフェースの作成（localStorage/sessionStorageの抽象化）
- [x] EventBus インターフェースの作成（window.dispatchEventの抽象化）
- [x] NetworkStatusProvider インターフェースの改善（navigator.onLineの抽象化）
- [x] TimeProvider インターフェースの作成（setTimeout/DateNowの抽象化）

#### 2.2 API層の改善
- [x] apiClientをファクトリー関数化（依存性注入を可能に）
- [x] グローバル変数（isRefreshing、failedRequestsQueue）の除去
- [x] HTTPクライアントインターフェースの定義

#### 2.3 認証層の改善
- [x] TokenStoreインターフェースの定義とDI対応
- [x] AuthProviderへの依存性注入対応
- [x] TokenProviderへの依存性注入対応
- [x] イベント通信をEventBus経由に変更

#### 2.4 同期処理の改善
- [x] SyncManagerのシングルトンパターンを依存性注入に変更
- [x] SyncQueueの抽象化
- [x] 暗号化処理（syncCrypto）の注入対応

### 3. テストユーティリティの作成

- [x] モックファクトリーの作成
  - [x] MockAuthProvider
  - [x] MockTokenProvider
  - [x] MockNetworkStatusProvider
  - [x] MockSyncManager
- [x] テスト用のダミーデータ生成関数
- [x] カスタムマッチャーの作成

### 4. ユニットテストの実装

#### 4.1 Hooks
- [x] `useAuth`のテスト
- [x] `useNetworkStatus`のテスト
- [x] `useSyncStatus`のテスト
- [x] `useSyncedMutation`のテスト
- [x] `useSyncedActivityLog`のテスト
- [x] カスタムhooksのテスト（useActivityLog等）

#### 4.2 Utils
- [x] queryParamsのテスト
- [x] 日付関連ユーティリティのテスト（timeUtils）
- [x] バリデーション関数のテスト（cn.ts、mutationParams.tsx）

#### 4.3 Services
- [x] SyncQueueのテスト
- [x] crypto関数のテスト
- [x] apiClient関数のテスト（モック使用）

### 5. 統合テストの実装

#### 5.1 Provider統合
- [x] AuthProvider + TokenProviderの統合テスト
- [x] NetworkStatusProvider + SyncManagerの統合テスト
- [x] 全Provider統合のテスト

#### 5.2 認証フロー
- [x] ログインフローのテスト
- [x] ログアウトフローのテスト
- [x] トークンリフレッシュのテスト
- [x] 認証エラー時の挙動テスト

#### 5.3 データ同期
- [x] オンライン時の同期テスト
- [x] オフライン時のキューイングテスト
- [x] オンライン復帰時の同期テスト
- [x] 同期エラー時のリトライテスト

### 6. E2Eテストの実装

- [ ] Playwrightのセットアップ
- [ ] 基本的な認証フローのE2Eテスト
- [ ] 活動記録の作成・編集・削除のE2Eテスト
- [ ] オフライン動作のE2Eテスト
- [ ] データ同期のE2Eテスト
- [ ] UIコンポーネントの動作テスト（Playwright Component Testing）
