# similarity-ts によるリファクタリング提案（改訂版）

## 分析概要
- 分析対象: 538ファイル
- 検出された重複ペア: 38組
- **重要**: 単純な類似度ではなく「両方とも同じ変更が入りそう」という観点で再評価

## 真に共通化すべきパターン

### 1. 🔴 【最優先】同期用ChangesAfterパターン (類似度: 94.07%)
**該当箇所:**
- `apps/backend/feature/activity/activityRepository.ts:357-417` getActivityChangesAfter
- `apps/backend/feature/task/taskRepository.ts:261-313` getTaskChangesAfter  
- `apps/backend/feature/activitygoal/activityGoalRepository.ts:265-307` getActivityGoalChangesAfter

**共通化すべき理由:**
- **全て同じ同期ロジック**を実装（timestamp以降の変更を取得）
- **hasMoreパターンが完全に同一**（limit+1で取得して判定）
- **ソート順も同一**（updatedAtで昇順）
- 同期の仕様変更時は全箇所に同じ変更が必要

**リファクタリング案:**
```typescript
// packages/backend-shared/repository/syncHelpers.ts
export function createGetChangesAfter<T>(
  db: QueryExecutor,
  table: Table,
  entityFactory: (row: any) => T
) {
  return async (
    userId: UserId,
    timestamp: Date,
    limit = 100
  ): Promise<{ items: T[]; hasMore: boolean }> {
    const rows = await db
      .select()
      .from(table)
      .where(and(eq(table.userId, userId), gt(table.updatedAt, timestamp)))
      .orderBy(asc(table.updatedAt))
      .limit(limit + 1);
    
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(entityFactory);
    
    return { items, hasMore };
  };
}
```

### 2. 🔴 【高優先】日付フォーマット処理
**該当箇所:**
- `toISOString().split("T")[0]` パターンが **42箇所**で使用
- `formatDateInTimezone` と `formatDate` の重複実装

**共通化すべき理由:**
- 日付フォーマットのロジック変更時、全箇所に影響
- タイムゾーン処理の一貫性が必要
- フォーマットミスがバグの原因になりやすい

**リファクタリング案:**
```typescript
// packages/shared/utils/dateFormat.ts
export const DateFormat = {
  toDateString(date: Date): string {
    return date.toISOString().split("T")[0];
  },
  
  toTimeString(date: Date): string {
    return date.toISOString().split("T")[1].split(".")[0];
  },
  
  toJSTDateString(date: Date): string {
    return formatDateInTimezone(date);
  }
};
```

### 3. 🟡 【中優先】エラーハンドリングミドルウェア
**該当箇所:**
- `apps/backend/lib/honoWithErrorHandling.ts` - 既に共通化済み
- 各ルートファイルで個別にエラー処理している箇所

**共通化すべき理由:**
- エラーレスポンスフォーマットの統一性
- ログ出力ロジックの一元管理
- 新しいエラータイプ追加時の変更箇所削減

**追加リファクタリング案:**
```typescript
// 既存のhonoWithErrorHandlingをさらに活用
// 個別ルートのtry-catchを削除してミドルウェアに委譲
```

### 4. 🟡 【中優先】認証チェックパターン
**該当箇所:**
- `authMiddleware` - 既に共通化済み
- API Key認証とユーザー認証の共通ロジック

**共通化すべき理由:**
- 認証ロジックの変更は全エンドポイントに影響
- セキュリティ修正を一箇所で適用可能

**現状:** 既に適切に共通化されている

## 共通化すべきでないもの（誤検出）

### ❌ Activity RoutesとQuery Serviceの重複
- **理由**: 責務が異なる（ルーティング vs データ変換）
- それぞれ独立して進化する可能性が高い

### ❌ CSVバリデーションとActivityStats処理
- **理由**: 用途が全く異なる
- 片方だけのロジック変更が頻繁に発生する

### ❌ 各ドメインのリポジトリメソッド（getByIdなど）
- **理由**: ドメイン固有のビジネスロジックが含まれる
- 将来的に個別の最適化が必要

### ❌ プラットフォーム別アダプター実装
- **理由**: プラットフォーム固有の実装詳細
- インターフェースは同じでも実装は異なるべき

## 実装優先順位

### フェーズ1（即座に実施すべき）
1. **同期用ChangesAfterパターンの共通化**
   - 影響範囲: 3ファイル
   - 削減行数: 約150行
   - リスク: 低（パターンが完全に同一）

2. **日付フォーマット処理の統一**
   - 影響範囲: 42箇所
   - 削減行数: 約100行
   - リスク: 低（単純な文字列処理）

### フェーズ2（検討後実施）
3. **エラーハンドリングの完全統一**
   - 既存のミドルウェアをさらに活用
   - 個別try-catchの削除

## 期待される効果

### 保守性の向上
- **同期ロジック変更**: 1箇所の修正で全体に反映
- **日付処理バグ**: 一元管理により発生リスク減少
- **テストカバレッジ**: 共通部分のテストで広範囲をカバー

### コード品質
- 実装の一貫性向上
- バグの早期発見が容易に
- 新規開発者の学習コスト削減

## 実装時の注意

1. **段階的移行**
   - 一度に全箇所を変更せず、段階的に適用
   - 各段階でテストを確実に実施

2. **後方互換性**
   - 既存のAPIインターフェースは維持
   - 内部実装のみを変更

3. **パフォーマンス測定**
   - 特に同期処理は高頻度で実行されるため注意
   - 抽象化によるオーバーヘッドを監視

---

*このドキュメントは「両方とも同じ変更が入りそう」という観点で再分析しました*