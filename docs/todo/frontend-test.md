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

- [ ] Vitestのフロントエンド用設定を追加（`apps/frontend/vitest.config.ts`）
- [ ] Testing Libraryのインストール（`@testing-library/react`、`@testing-library/user-event`）
- [ ] jsdom環境の設定
- [ ] MSW（Mock Service Worker）のインストールと設定
- [ ] テスト用setupファイルの作成（`apps/frontend/test.setup.ts`）

### 2. 依存性の抽象化とリファクタリング

#### 2.1 グローバル依存の抽象化
- [ ] StorageProvider インターフェースの作成（localStorage/sessionStorageの抽象化）
- [ ] EventBus インターフェースの作成（window.dispatchEventの抽象化）
- [ ] NetworkStatusProvider インターフェースの改善（navigator.onLineの抽象化）
- [ ] TimeProvider インターフェースの作成（setTimeout/DateNowの抽象化）

#### 2.2 API層の改善
- [ ] apiClientをファクトリー関数化（依存性注入を可能に）
- [ ] グローバル変数（isRefreshing、failedRequestsQueue）の除去
- [ ] HTTPクライアントインターフェースの定義

#### 2.3 認証層の改善
- [ ] TokenStoreインターフェースの定義とDI対応
- [ ] AuthProviderへの依存性注入対応
- [ ] TokenProviderへの依存性注入対応
- [ ] イベント通信をEventBus経由に変更

#### 2.4 同期処理の改善
- [ ] SyncManagerのシングルトンパターンを依存性注入に変更
- [ ] SyncQueueの抽象化
- [ ] 暗号化処理（syncCrypto）の注入対応

### 3. テストユーティリティの作成

- [ ] カスタムrenderメソッドの作成（全Providerを含む）
- [ ] モックファクトリーの作成
  - [ ] MockAuthProvider
  - [ ] MockTokenProvider
  - [ ] MockNetworkStatusProvider
  - [ ] MockSyncManager
- [ ] テスト用のダミーデータ生成関数
- [ ] カスタムマッチャーの作成

### 4. ユニットテストの実装

#### 4.1 Hooks
- [ ] `useAuth`のテスト
- [ ] `useNetworkStatus`のテスト
- [ ] `useSyncStatus`のテスト
- [ ] `useSyncedMutation`のテスト
- [ ] `useSyncedActivityLog`のテスト
- [ ] カスタムhooksのテスト（useActivityLog等）

#### 4.2 Utils
- [ ] queryParamsのテスト
- [ ] 日付関連ユーティリティのテスト
- [ ] バリデーション関数のテスト

#### 4.3 Services
- [ ] SyncQueueのテスト
- [ ] crypto関数のテスト
- [ ] apiClient関数のテスト（モック使用）

### 5. 統合テストの実装

#### 5.1 Provider統合
- [ ] AuthProvider + TokenProviderの統合テスト
- [ ] NetworkStatusProvider + SyncManagerの統合テスト
- [ ] 全Provider統合のテスト

#### 5.2 認証フロー
- [ ] ログインフローのテスト
- [ ] ログアウトフローのテスト
- [ ] トークンリフレッシュのテスト
- [ ] 認証エラー時の挙動テスト

#### 5.3 データ同期
- [ ] オンライン時の同期テスト
- [ ] オフライン時のキューイングテスト
- [ ] オンライン復帰時の同期テスト
- [ ] 同期エラー時のリトライテスト

### 6. コンポーネントテストの実装

#### 6.1 認証関連
- [ ] ログインページのテスト
- [ ] 認証ガードのテスト

#### 6.2 活動記録
- [ ] ActivityRegistPageのテスト
- [ ] ActivityLogCreateDialogのテスト
- [ ] ActivityLogEditDialogのテスト
- [ ] DailyPageのテスト

#### 6.3 同期UI
- [ ] OfflineBannerのテスト
- [ ] SyncStatusIndicatorのテスト
- [ ] SyncProgressBarのテスト
- [ ] NetworkDebugToggleのテスト

### 7. E2Eテストの実装

- [ ] Playwrightのセットアップ
- [ ] 基本的な認証フローのE2Eテスト
- [ ] 活動記録の作成・編集・削除のE2Eテスト
- [ ] オフライン動作のE2Eテスト
- [ ] データ同期のE2Eテスト

### 8. CI/CD統合

- [ ] GitHub ActionsでのフロントエンドテストJob追加
- [ ] カバレッジレポートの設定
- [ ] PR時の自動テスト実行
- [ ] テスト失敗時のデプロイ防止

## 実装優先順位

1. **最優先**: テスト環境セットアップ + 依存性の抽象化（特にapiClient）
2. **高優先**: 認証関連のテスト（useAuth、AuthProvider）
3. **中優先**: 同期処理のテスト（SyncManager、useSyncedMutation）
4. **低優先**: UIコンポーネントのテスト、E2Eテスト

## 成功指標

- カバレッジ目標: 80%以上（重要な機能は90%以上）
- テスト実行時間: ユニットテスト3秒以内、統合テスト10秒以内
- モック使用率: 外部依存の100%をモック可能に
- CI実行時間: 5分以内で全テスト完了