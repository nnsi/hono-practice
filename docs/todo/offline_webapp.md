# Frontend オフライン対応実装チェックリスト

## 1. 技術選定と基本設計

### Service Worker の設定

- [ ] Vite PWA プラグインのインストール (`vite-plugin-pwa`)
- [ ] Service Worker の基本設定
  - [ ] キャッシュ戦略の決定 (Network First / Cache First)
  - [ ] 静的リソースのプリキャッシュ設定
  - [ ] ランタイムキャッシュの設定
- [ ] マニフェストファイルの作成

### ローカルストレージの設計

- [ ] IndexedDB ライブラリの選定 (Dexie.js / idb)
- [ ] ローカルデータベーススキーマの設計
  - [ ] tasks テーブル
  - [ ] activities テーブル  
  - [ ] activityLogs テーブル
  - [ ] syncQueue テーブル (同期待ちのデータ)
  - [ ] conflicts テーブル (競合データ)

## 2. オフライン検知とUI

- [ ] ネットワーク状態の監視Hook作成 (`useOnlineStatus`)
- [ ] オフライン時のUI表示
  - [ ] ステータスバー/インジケーターの実装
  - [ ] オフライン時の機能制限の明示
- [ ] 同期状態の表示UI
  - [ ] 同期中インジケーター
  - [ ] 同期エラーの表示

## 3. データ永続化レイヤーの実装

### ローカルストレージ抽象化レイヤー

- [ ] `LocalStorageManager` クラスの実装
  - [ ] CRUD操作の実装
  - [ ] トランザクション管理
  - [ ] エラーハンドリング

### React Query 統合

- [ ] カスタム `QueryClient` の設定
  - [ ] オフライン時のキャッシュ永続化
  - [ ] `persistQueryClient` の設定
- [ ] オフライン対応Mutation の実装
  - [ ] 楽観的更新の実装
  - [ ] ロールバック機能
  - [ ] 同期キューへの追加

## 4. 各エンティティのオフライン対応

### Tasks のオフライン対応

- [ ] `useOfflineTasks` Hookの実装
  - [ ] ローカルとリモートデータのマージ
  - [ ] 作成・更新・削除のオフライン対応
  - [ ] タスクのステータス管理 (ローカル/同期済み/同期中)
- [ ] タスクのローカルID生成戦略
  - [ ] UUID または timestamp ベースのID
  - [ ] サーバー側IDとのマッピング

### Activities のオフライン対応

- [ ] `useOfflineActivities` Hookの実装
- [ ] アクティビティのCRUD操作のオフライン対応
- [ ] 絵文字や単位などのメタデータのキャッシュ

### Activity Logs のオフライン対応

- [ ] `useOfflineActivityLogs` Hookの実装
- [ ] 日付ベースのクエリのオフライン対応
- [ ] 統計データの計算 (オフラインデータ含む)

## 5. 同期メカニズムの実装

### 同期エンジン

- [ ] `SyncEngine` クラスの実装
  - [ ] 同期キューの管理
  - [ ] バッチ同期処理
  - [ ] エラーリトライ機能
  - [ ] 指数バックオフの実装

### 同期戦略

- [ ] オンライン復帰時の自動同期
- [ ] バックグラウンド同期の実装
- [ ] 手動同期のトリガー機能
- [ ] 同期の優先順位設定
  - [ ] 最新のデータを優先
  - [ ] エンティティタイプ別の優先順位

## 6. 競合解決

### 競合検出

- [ ] タイムスタンプベースの競合検出
- [ ] バージョニングシステムの実装
- [ ] 変更追跡の実装

### 競合解決戦略

- [ ] 自動解決ルールの実装
  - [ ] Last Write Wins
  - [ ] クライアント優先 / サーバー優先
- [ ] 手動競合解決UI
  - [ ] 競合データの比較表示
  - [ ] マージツール

## 7. セキュリティとデータ保護

- [ ] ローカルデータの暗号化検討
- [ ] センシティブデータの取り扱い方針
- [ ] データの有効期限設定
- [ ] ローカルストレージのクリーンアップ機能

## 8. テストとデバッグ

### 単体テスト

- [ ] オフラインストレージのテスト
- [ ] 同期ロジックのテスト
- [ ] 競合解決のテスト

### 統合テスト  

- [ ] オフライン→オンライン遷移のテスト
- [ ] データ整合性のテスト
- [ ] エッジケースのテスト

### デバッグツール

- [ ] IndexedDB インスペクター
- [ ] 同期状態のデバッグUI
- [ ] ログ出力の実装

## 9. パフォーマンス最適化

- [ ] ローカルデータのインデックス最適化
- [ ] 大量データの処理最適化
- [ ] メモリ使用量の監視と最適化
- [ ] 同期処理のスロットリング

## 10. ドキュメントと移行

- [ ] 開発者向けドキュメント作成
  - [ ] アーキテクチャ図
  - [ ] API仕様
  - [ ] トラブルシューティングガイド
- [ ] 既存ユーザーのデータ移行計画
- [ ] ロールバック計画

## 11. 段階的リリース計画

- [ ] フィーチャーフラグの実装
- [ ] A/Bテストの準備
- [ ] 段階的ロールアウト計画
  - [ ] Phase 1: 読み取り専用のオフライン対応
  - [ ] Phase 2: 基本的な作成・更新
  - [ ] Phase 3: 完全なオフライン対応

## 12. アーキテクチャ設計

### ディレクトリ構造

```txt
apps/frontend/src/
├── features/
│   └── offline/
│       ├── infrastructure/
│       │   ├── db/
│       │   │   ├── schema.ts          // IndexedDBスキーマ定義
│       │   │   ├── migrations.ts      // スキーママイグレーション
│       │   │   └── connection.ts      // Dexie接続管理
│       │   └── repositories/
│       │       ├── OfflineTaskRepository.ts
│       │       ├── OfflineActivityRepository.ts
│       │       └── SyncQueueRepository.ts
│       ├── domain/
│       │   ├── SyncStatus.ts         // 同期状態の値オブジェクト
│       │   ├── ConflictResolution.ts // 競合解決ストラテジー
│       │   └── OfflineEntity.ts      // オフライン用の拡張エンティティ
│       ├── usecases/
│       │   ├── OfflineTaskUsecase.ts
│       │   ├── SyncUsecase.ts
│       │   └── ConflictResolutionUsecase.ts
│       └── hooks/
│           ├── useOfflineTasks.ts
│           ├── useSync.ts
│           └── useOnlineStatus.ts
```

### 設計方針

#### バックエンドとの関係

- [ ] ドメインモデル（Zodスキーマ）の共有方法の決定
  - [ ] `packages/shared/domain` の作成検討
  - [ ] バリデーションロジックの共通化
- [ ] Repository/Usecase の共有戦略
  - [ ] インターフェースのみ共有
  - [ ] 実装は環境別に分離
  - [ ] ビジネスロジックは可能な限り共通化

#### オフライン固有の拡張

- [ ] エンティティの拡張設計

```typescript
  interface OfflineTask extends Task {
    _syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict';
    _localId?: string;
    _lastModified: number;
    _version: number;
  }
```

- [ ] Repository パターンの実装
  - [ ] バックエンドと同じインターフェース
  - [ ] IndexedDB固有の実装
  - [ ] トランザクション管理

#### データフロー設計

- [ ] オンライン時のフロー
  1. API経由でデータ取得
  2. IndexedDBにキャッシュ
  3. UIに表示
- [ ] オフライン時のフロー
  1. IndexedDBから読み込み
  2. ローカル変更を記録
  3. 同期キューに追加
- [ ] 同期時のフロー
  1. 同期キューから取得
  2. APIに送信
  3. 競合解決
  4. ローカルDB更新

### 実装上の考慮事項

- [ ] 既存のReact Query構造との統合
  - [ ] カスタムQueryClient設定
  - [ ] オフライン対応hooks
- [ ] エラーハンドリング戦略
  - [ ] ネットワークエラー
  - [ ] 同期エラー
  - [ ] ストレージエラー
- [ ] テスト戦略
  - [ ] IndexedDBのモック
  - [ ] オフライン/オンライン遷移テスト

---

このチェックリストは初期のものです。実装の進行に合わせて適宜更新してください。

## 参考リンク

- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Dexie.js](https://dexie.org/)
- [TanStack Query Offline](https://tanstack.com/query/latest/docs/react/plugins/persistQueryClient)
