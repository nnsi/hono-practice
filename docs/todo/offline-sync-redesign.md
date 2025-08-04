# オフライン同期処理の再設計

## 現状の問題点

### 1. 多層的なアーキテクチャによる複雑性
- SyncManager、SyncQueue、各種フック、アダプター層など多くの層が絡み合っている
- 責務が分散しており、処理の流れを追うのが困難
- 依存性注入とアダプターパターンが過度に複雑

### 2. オンライン/オフラインで異なる処理パス
- `useSyncedMutation`内でオンライン/オフラインの分岐が複雑
- エラーハンドリングのパスが異なる
- 楽観的更新とキューイングが混在

### 3. イベントベースの通信による状態管理の分散
- CustomEventでの通信により、状態の変化を追いづらい
- イベントリスナーの登録/解除のライフサイクル管理が複雑
- デバッグが困難

### 4. エンティティタイプごとの処理の違い
- ActivityLog、Task、Activityなど、エンティティごとに異なる処理
- 汎用性が低く、新しいエンティティの追加が困難

### 5. テストの困難さ
- モックすべき依存が多すぎる
- 非同期処理とイベントの組み合わせでテストが複雑

## 新設計の方針

### 基本原則
1. **シンプルさ優先** - 最小限の抽象化で必要な機能を実現
2. **単一責任** - 各コンポーネントの責務を明確に
3. **テスタブル** - 依存を最小限にしてテストしやすく
4. **デバッガブル** - 処理の流れを追いやすく

## 提案する新アーキテクチャ

### 1. コア設計

```typescript
// 同期キューのアイテム（シンプル化）
type SyncItem = {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string; // 'activityLog' | 'task' | 'activity'
  entityId: string;
  data: Record<string, unknown>;
  retryCount: number;
  createdAt: number;
};

// 同期ストア（Zustandで実装）
interface SyncStore {
  // 状態
  queue: SyncItem[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  
  // アクション
  enqueue: (item: Omit<SyncItem, 'id' | 'retryCount' | 'createdAt'>) => void;
  dequeue: (id: string) => void;
  sync: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
}
```

### 2. シンプルなフック設計

```typescript
// 汎用的な同期ミューテーションフック
function useSyncedMutation<TData, TVariables>({
  entity,
  operation,
  mutationFn,
  optimisticUpdate,
}: {
  entity: string;
  operation: 'create' | 'update' | 'delete';
  mutationFn: (variables: TVariables) => Promise<TData>;
  optimisticUpdate?: (variables: TVariables) => void;
}) {
  const { enqueue, isOnline } = useSyncStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variables: TVariables) => {
      // 楽観的更新
      if (optimisticUpdate) {
        optimisticUpdate(variables);
      }
      
      try {
        if (isOnline) {
          // オンライン時は直接API呼び出し
          return await mutationFn(variables);
        } else {
          // オフライン時はキューに追加
          const entityId = (variables as any).id || generateId();
          enqueue({
            type: operation,
            entity,
            entityId,
            data: variables as Record<string, unknown>,
          });
          
          // 楽観的レスポンスを返す
          return { id: entityId, ...variables } as TData;
        }
      } catch (error) {
        // エラー時もキューに追加（リトライのため）
        const entityId = (variables as any).id || generateId();
        enqueue({
          type: operation,
          entity,
          entityId,
          data: variables as Record<string, unknown>,
        });
        throw error;
      }
    },
  });
}
```

### 3. 同期処理の統一

```typescript
// 同期マネージャー（シングルトン）
class SimpleSyncManager {
  private store: SyncStore;
  private syncInterval: number | null = null;
  
  constructor(store: SyncStore) {
    this.store = store;
  }
  
  // 自動同期の開始
  startAutoSync(intervalMs = 30000) {
    this.stopAutoSync();
    
    this.syncInterval = window.setInterval(() => {
      if (this.store.isOnline && this.store.queue.length > 0) {
        this.store.sync();
      }
    }, intervalMs);
    
    // オンライン復帰時の即時同期
    window.addEventListener('online', this.handleOnline);
  }
  
  // 自動同期の停止
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    window.removeEventListener('online', this.handleOnline);
  }
  
  private handleOnline = () => {
    this.store.setOnlineStatus(true);
    this.store.sync();
  };
}
```

### 4. バッチ同期API

```typescript
// バックエンドのバッチ同期エンドポイント
interface BatchSyncRequest {
  items: Array<{
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: string;
    entityId: string;
    data: Record<string, unknown>;
  }>;
}

interface BatchSyncResponse {
  results: Array<{
    id: string;
    status: 'success' | 'error';
    error?: string;
    data?: Record<string, unknown>;
  }>;
}

// 同期処理の実装
async function performSync(items: SyncItem[]): Promise<void> {
  const response = await api.sync.batch({
    items: items.map(item => ({
      id: item.id,
      type: item.type,
      entity: item.entity,
      entityId: item.entityId,
      data: item.data,
    })),
  });
  
  // 成功したアイテムをキューから削除
  response.results.forEach((result, index) => {
    if (result.status === 'success') {
      store.dequeue(items[index].id);
    } else {
      // リトライカウントを増やす
      store.incrementRetryCount(items[index].id);
    }
  });
}
```

## 移行計画

### フェーズ1: 新実装の準備
1. Zustandストアの実装
2. SimpleSyncManagerの実装
3. useSyncedMutationフックの実装
4. バッチ同期APIの実装

### フェーズ2: 段階的移行
1. 新しいフックを使った実装を並行して作成
2. フィーチャーフラグで新旧の切り替えを可能に
3. エンティティごとに段階的に移行

### フェーズ3: 旧実装の削除
1. 全エンティティの移行完了を確認
2. 旧実装（SyncManager、SyncQueue等）を削除
3. 不要な依存関係を削除

## 利点

### 1. シンプルさ
- コード量が大幅に削減
- 処理の流れが明確
- デバッグが容易

### 2. テスタビリティ
- Zustandストアのモックが簡単
- 同期処理を単体でテスト可能
- E2Eテストも簡潔に

### 3. 保守性
- 新しいエンティティの追加が容易
- バグの原因を特定しやすい
- ドキュメント化が簡単

### 4. パフォーマンス
- 不要な抽象化レイヤーの削除
- イベントリスナーの削減
- メモリ使用量の削減

## 実装例

### ActivityLogの同期フック

```typescript
export function useCreateActivityLog() {
  return useSyncedMutation({
    entity: 'activityLog',
    operation: 'create',
    mutationFn: async (data: CreateActivityLogData) => {
      const response = await api.activityLogs.create(data);
      return response.data;
    },
    optimisticUpdate: (data) => {
      // React Queryのキャッシュを更新
      queryClient.setQueryData(['activityLogs'], (old) => {
        return [...(old || []), { id: generateId(), ...data }];
      });
    },
  });
}
```

### 使用例

```typescript
function ActivityForm() {
  const createMutation = useCreateActivityLog();
  
  const handleSubmit = (data: FormData) => {
    // オンライン/オフラインを意識せずに使える
    createMutation.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* フォームの実装 */}
    </form>
  );
}
```

## バックエンドの現状と改善案

### 現状のバックエンドの問題点

#### 1. 巨大なsyncBatchItemsメソッド
- `syncService.ts`の`syncBatchItems`メソッドが500行以上
- エンティティタイプごとの処理が全て1つのメソッドに含まれている
- コードの重複が多く、保守性が低い

#### 2. 多層的なアーキテクチャ
- Route → Handler → Usecase → Service → Repository の5層
- 各層の責務が不明確で、処理が分散

#### 3. エンティティ固有の処理
- エンティティタイプごとに異なる処理を直接記述
- 新しいエンティティの追加が困難
- DRY原則に反する実装

### バックエンドの改善案（レイヤードアーキテクチャを維持）

#### 1. エンティティごとの同期ストラテジー

```typescript
// 各エンティティの同期処理を定義する型
type EntitySyncStrategy<T> = {
  entityType: string;
  validatePayload: (payload: unknown) => void;
  buildEntity: (payload: unknown, userId: string, entityId: string) => T;
  checkDependencies?: (tx: QueryExecutor, entity: T) => Promise<void>;
};

// ActivityLog用のストラテジーファクトリ関数
function createActivityLogSyncStrategy(
  activityRepository: ActivityRepository,
): EntitySyncStrategy<ActivityLog> {
  const validatePayload = (payload: unknown): void => {
    const p = payload as any;
    if (!p.activityId || !p.date || typeof p.quantity !== 'number') {
      throw new DomainValidateError('必須項目が不足しています');
    }
  };
  
  const buildEntity = (payload: unknown, userId: string, entityId: string): ActivityLog => {
    const p = payload as any;
    return {
      id: entityId as ActivityLogId,
      userId: userId as UserId,
      date: p.date,
      quantity: p.quantity,
      memo: p.memo || '',
      activityId: p.activityId,
      activityKindId: p.activityKindId || null,
      type: 'new',
    };
  };
  
  const checkDependencies = async (tx: QueryExecutor, entity: ActivityLog): Promise<void> => {
    const activity = await activityRepository
      .withTx(tx)
      .getActivityByIdAndUserId(entity.userId, entity.activityId);
    
    if (!activity) {
      throw new ResourceNotFoundError('関連するActivityが存在しません');
    }
  };
  
  return {
    entityType: 'activityLog',
    validatePayload,
    buildEntity,
    checkDependencies,
  };
}
```

#### 2. リファクタリングされたSyncService

```typescript
// 既存のレイヤー構造を維持しつつ、エンティティごとの処理を分離
function syncBatchItems(
  db: QueryExecutor,
  strategies: Map<string, EntitySyncStrategy<any>>,
  repositories: SyncRepositories,
) {
  return async (
    userId: string,
    items: SyncItem[],
    conflictStrategy: ConflictResolutionStrategy = 'timestamp',
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const conflictResolver = createConflictResolver();
    
    // エンティティタイプごとにグループ化
    const groupedItems = groupByEntityType(items);
    
    // 処理順序に従って実行
    for (const entityType of ENTITY_PROCESSING_ORDER) {
      const entityItems = groupedItems.get(entityType);
      if (!entityItems || entityItems.length === 0) continue;
      
      const strategy = strategies.get(entityType);
      if (!strategy) {
        results.push(...entityItems.map(item => ({
          clientId: item.clientId,
          status: 'error' as const,
          error: `未対応のエンティティタイプ: ${entityType}`,
        })));
        continue;
      }
      
      // エンティティタイプごとにトランザクションで処理
      await db.transaction(async (tx) => {
        for (const item of entityItems) {
          try {
            const result = await processSyncItem(
              tx,
              userId,
              item,
              strategy,
              repositories,
              conflictResolver,
              conflictStrategy,
            );
            results.push(result);
          } catch (error) {
            results.push({
              clientId: item.clientId,
              status: 'error',
              error: error instanceof Error ? error.message : '同期エラー',
            });
          }
        }
      });
    }
    
    return results;
  };
}

// 個別のアイテム処理（共通化）
async function processSyncItem<T>(
  tx: QueryExecutor,
  userId: string,
  item: SyncItem,
  strategy: EntitySyncStrategy<T>,
  repositories: SyncRepositories,
  conflictResolver: ConflictResolver,
  conflictStrategy: ConflictResolutionStrategy,
): Promise<SyncResult> {
  const repo = repositories[item.entityType];
  if (!repo) {
    throw new Error(`リポジトリが見つかりません: ${item.entityType}`);
  }
  
  // ペイロードの検証
  strategy.validatePayload(item.payload);
  
  // エンティティの構築
  const entity = strategy.buildEntity(item.payload, userId, item.entityId);
  
  // 既存エンティティの確認
  const existing = await repo.withTx(tx).findByIdAndUserId(userId, item.entityId);
  
  switch (item.operation) {
    case 'create':
      if (existing) {
        return {
          clientId: item.clientId,
          status: 'skipped',
          message: '既に存在するため、作成をスキップしました',
          serverId: item.entityId,
          payload: existing as unknown as Record<string, unknown>,
        };
      }
      
      // 依存関係チェック
      if (strategy.checkDependencies) {
        await strategy.checkDependencies(tx, entity);
      }
      
      const created = await repo.withTx(tx).create(entity);
      return {
        clientId: item.clientId,
        status: 'success',
        serverId: item.entityId,
        payload: created as unknown as Record<string, unknown>,
      };
      
    case 'update':
      if (!existing) {
        throw new ResourceNotFoundError('更新対象が存在しません');
      }
      
      // コンフリクト検出と解決
      if (detectConflict(entity, existing)) {
        const resolved = conflictResolver.resolve(entity, existing, conflictStrategy);
        const updated = await repo.withTx(tx).update(resolved);
        return {
          clientId: item.clientId,
          status: 'conflict',
          conflictData: existing,
          payload: updated as unknown as Record<string, unknown>,
        };
      }
      
      const updated = await repo.withTx(tx).update(entity);
      return {
        clientId: item.clientId,
        status: 'success',
        payload: updated as unknown as Record<string, unknown>,
      };
      
    case 'delete':
      if (!existing) {
        return {
          clientId: item.clientId,
          status: 'skipped',
          message: '既に削除されているため、削除をスキップしました',
        };
      }
      
      await repo.withTx(tx).delete(existing);
      return {
        clientId: item.clientId,
        status: 'success',
        serverId: item.entityId,
      };
  }
}

// SyncServiceのファクトリ関数
export function newSyncService(
  db: QueryExecutor,
  activityRepository: ActivityRepository,
  activityLogRepository: ActivityLogRepository,
  activityGoalRepository: ActivityGoalRepository,
  taskRepository: TaskRepository,
) {
  // 各エンティティのストラテジーを作成
  const strategies = new Map<string, EntitySyncStrategy<any>>([
    ['activity', createActivitySyncStrategy()],
    ['activityLog', createActivityLogSyncStrategy(activityRepository)],
    ['task', createTaskSyncStrategy()],
    ['goal', createGoalSyncStrategy()],
  ]);
  
  // リポジトリマップ
  const repositories: SyncRepositories = {
    activity: activityRepository,
    activityLog: activityLogRepository,
    task: taskRepository,
    goal: activityGoalRepository,
  };
  
  return {
    syncBatchItems: syncBatchItems(db, strategies, repositories),
    // 他のメソッド...
  };
}
```

#### 3. Usecaseレイヤーの簡潔化

```typescript
// SyncUsecaseの実装（既存のレイヤー構造を維持）
function batchSync(syncRepository: SyncRepository, syncService: SyncService) {
  return async (
    userId: string,
    request: BatchSyncRequest,
    strategy: ConflictResolutionStrategy = "timestamp",
  ): Promise<BatchSyncResponse> => {
    if (!syncService) {
      throw new UnexpectedError("SyncServiceが提供されていません");
    }

    try {
      // 同期処理を実行
      const results = await syncService.syncBatchItems(
        userId,
        request.items,
        strategy,
      );

      // サーバー側の変更を取得
      const serverChanges = request.lastSyncTimestamp
        ? await syncRepository.getChangesAfter(
            userId,
            new Date(request.lastSyncTimestamp),
          )
        : [];

      return {
        results,
        serverChanges: serverChanges.map(formatServerChange),
        syncTimestamp: new Date().toISOString(),
        hasMore: serverChanges.length >= 100,
      };
    } catch (error) {
      throw new UnexpectedError("バッチ同期に失敗しました", error as Error);
    }
  };
}
```

### バックエンド改善の利点

1. **レイヤードアーキテクチャの維持**
   - 既存のRoute → Handler → Usecase → Service → Repositoryの構造を保持
   - 各層の責務が明確なまま、エンティティごとの処理をストラテジーパターンで分離

2. **拡張性の向上**
   - 新しいエンティティの追加が容易（ストラテジーを実装して登録するだけ）
   - 各エンティティの処理が独立しており、影響範囲が限定的

3. **コードの重複削減**
   - CREATE/UPDATE/DELETEの共通処理を`processSyncItem`に集約
   - 冪等性チェック、コンフリクト解決などの共通ロジックを一元化

4. **テスタビリティ**
   - 各ストラテジーを個別にテスト可能
   - 共通処理と個別処理を分離してテスト

5. **保守性**
   - 500行以上あった`syncBatchItems`を大幅に簡潔化
   - エンティティごとの処理が明確に分離され、理解しやすい

## 推奨される移行戦略：完全削除からの再構築

### 現状分析

オフライン同期処理がなくてもアプリケーションの本質的な価値は提供できているため、既存の同期処理を全て削除してから再実装する方が効率的です。

### 削除の影響範囲

#### 1. 削除対象のディレクトリ
- `packages/frontend-shared/sync/` - 同期処理のコア実装
- `apps/backend/feature/sync/` - バックエンドの同期API
- `apps/frontend/src/hooks/sync/` - 同期関連のフック
- `apps/frontend/src/services/sync/` - 同期サービス

#### 2. 置き換えが必要なフック
現在、約10個のコンポーネントが以下のフックを使用：
- `useCreateActivityLog`、`useUpdateActivityLog`、`useDeleteActivityLog`
- `useCreateTask`、`useUpdateTask`、`useDeleteTask`

これらは`apps/frontend/src/hooks/api/`にある同名のシンプルなフックに置き換え可能。

### 削除手順

#### フェーズ1: フロントエンドの同期処理を削除（1-2時間）
```bash
# 1. import文の一括置換
# hooks/sync/* → hooks/api/* に変更
find apps/frontend/src -name "*.ts*" -exec sed -i 's/@frontend\/hooks\/sync/@frontend\/hooks\/api/g' {} \;

# 2. 同期関連ディレクトリの削除
rm -rf apps/frontend/src/hooks/sync
rm -rf apps/frontend/src/services/sync
rm -rf packages/frontend-shared/sync

# 3. NetworkStatusProviderの簡略化
# SyncManager関連のコードを削除し、オンライン/オフライン状態の管理のみ残す

# 4. テストファイルの削除・修正
rm -rf apps/frontend/src/test-utils/MockSyncManager.tsx
```

#### フェーズ2: バックエンドの同期処理を削除（30分）
```bash
# 1. 同期関連のルート削除
rm -rf apps/backend/feature/sync

# 2. ルーティングから同期エンドポイントを削除
# apps/backend/index.ts から syncRoute を削除

# 3. データベースから同期関連テーブルを削除
# 新しいマイグレーションファイルを作成
npm run db-generate

# 4. スキーマから同期関連テーブルを削除
# infra/drizzle/schema.ts から以下を削除：
# - syncMetadata テーブル定義
# - syncQueue テーブル定義
```

**削除対象のテーブル：**
- `sync_metadata` - 同期のメタデータ（最終同期時刻、ステータス、エラー情報など）
- `sync_queue` - 同期キュー（保留中の同期操作を管理）

#### フェーズ3: 動作確認とクリーンアップ（1時間）
1. アプリケーションが正常に動作することを確認
2. 不要な依存関係を削除
3. 型エラーの修正
4. テストの実行

### 削除後の状態

削除後は、全ての操作が即座にAPIを呼び出すシンプルな構造になります：
- オフライン時はエラーメッセージを表示
- オンライン時は通常通り動作
- 複雑な同期ロジックなし

### 新実装への準備

削除が完了したら、以下の順序で新しい同期システムを実装：

1. **最小限の実装から開始**
   - オフライン時のデータ保存（LocalStorage）
   - オンライン復帰時の自動送信
   - 基本的な楽観的更新

2. **段階的な機能追加**
   - バッチ処理
   - コンフリクト解決
   - エラーハンドリングの改善

## まとめ

現在の同期処理の複雑性を考慮すると、段階的な改善よりもクリーンスレート・アプローチの方が効率的です。新旧システムを並行運用することで、リスクを最小限に抑えながら、シンプルで保守性の高い同期システムを構築できます。