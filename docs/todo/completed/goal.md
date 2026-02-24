# Goal API 仕様書

## 概要

目標設定機能では、2つの異なる目標タイプを統一的なAPIで管理します：

1. **負債目標 (Debt Goal)**: 日次目標量に対する負債・貯金システム
2. **月間目標 (Monthly Target Goal)**: 月間での目標達成システム

## API エンドポイント

### 1. 目標一覧取得

**GET** `/api/goals`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | `debt \| monthly` | No | 目標タイプでフィルタリング |
| activityId | `string` | No | 特定のアクティビティでフィルタリング |

#### Response

```typescript
{
  goals: Array<DebtGoal | MonthlyTargetGoal>
}

type DebtGoal = {
  type: "debt"
  id: string
  userId: string
  activityId: string
  activityName: string
  dailyTargetQuantity: number
  startDate: string // YYYY-MM-DD
  endDate: string | null
  isActive: boolean
  description: string | null
  balance: {
    currentBalance: number    // 負の値=負債、正の値=貯金
    totalDebt: number        // 累積負債
    totalActual: number      // 累積実績
    dailyTarget: number      // 1日の目標量
    daysActive: number       // 稼働日数
    lastCalculatedDate: string
  }
}

type MonthlyTargetGoal = {
  type: "monthly"
  id: string
  userId: string
  activityId: string
  activityName: string
  targetQuantity: number
  targetMonth: string      // YYYY-MM
  description: string | null
  progress: {
    currentQuantity: number   // 現在の実績
    targetQuantity: number    // 目標量
    progressRate: number      // 進捗率 (0.0-1.0)
    remainingQuantity: number // 残り必要量
    remainingDays: number     // 残り日数
    dailyPaceRequired: number // 必要な日割りペース
    isAchieved: boolean      // 達成済みかどうか
  }
}
```

#### Example

```bash
GET /api/goals
GET /api/goals?type=debt
GET /api/goals?activityId=12345&type=monthly
```

### 2. 個別目標取得

**GET** `/api/goals/:type/:id`

#### Path Parameters

| Parameter | Type | Values |
|-----------|------|--------|
| type | string | `debt` \| `monthly` |
| id | string | 目標ID |

#### Response

同じ形式の `DebtGoal` または `MonthlyTargetGoal`

#### Example

```bash
GET /api/goals/debt/550e8400-e29b-41d4-a716-446655440000
GET /api/goals/monthly/550e8400-e29b-41d4-a716-446655440001
```

### 3. 負債目標作成

**POST** `/api/goals/debt`

#### Request Body

```typescript
{
  activityId: string
  dailyTargetQuantity: number
  startDate: string          // YYYY-MM-DD
  endDate?: string | null    // YYYY-MM-DD (optional)
  description?: string | null
}
```

#### Response

作成された `DebtGoal`

#### Example

```json
{
  "activityId": "550e8400-e29b-41d4-a716-446655440000",
  "dailyTargetQuantity": 10,
  "startDate": "2024-01-01",
  "endDate": null,
  "description": "毎日10回の腕立て伏せ"
}
```

### 4. 月間目標作成

**POST** `/api/goals/monthly`

#### Request Body

```typescript
{
  activityId: string
  targetQuantity: number
  targetMonth: string        // YYYY-MM
  description?: string | null
}
```

#### Response

作成された `MonthlyTargetGoal`

#### Example

```json
{
  "activityId": "550e8400-e29b-41d4-a716-446655440000",
  "targetQuantity": 300,
  "targetMonth": "2024-01",
  "description": "1月に300回の腕立て伏せ"
}
```

### 5. 目標更新 (未実装)

**PUT** `/api/goals/:type/:id`

### 6. 目標削除 (未実装)

**DELETE** `/api/goals/:type/:id`

## エラーレスポンス

### 400 Bad Request

```json
{
  "error": "Validation error",
  "details": {
    "field": "dailyTargetQuantity",
    "message": "Expected number, received string"
  }
}
```

### 404 Not Found

```json
{
  "error": "Debt goal not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## フロントエンド実装期待

### 1. 目標作成・設定画面

#### 共通要素

- **アクティビティ選択**: ドロップダウンでアクティビティを選択
- **説明欄**: オプショナルな説明テキスト
- **目標タイプ選択**: 負債目標 vs 月間目標のラジオボタン/タブ

#### 負債目標作成フォーム

```tsx
interface DebtGoalForm {
  activityId: string
  dailyTargetQuantity: number  // 数値入力
  startDate: string           // 日付ピッカー（デフォルト: 今日）
  endDate?: string | null     // 日付ピッカー（オプショナル、無期限も可能）
  description?: string
}
```

**実装ポイント**:

- 日次目標量は正の数値のみ受け付け
- 開始日は今日以降を推奨
- 終了日は開始日より後でなければならない
- 「無期限」オプションの提供

#### 月間目標作成フォーム

```tsx
interface MonthlyGoalForm {
  activityId: string
  targetQuantity: number      // 数値入力
  targetMonth: string         // 月選択（YYYY-MM形式）
  description?: string
}
```

**実装ポイント**:

- 目標量は正の数値のみ受け付け
- 月選択は当月以降を推奨
- 過去の月での目標設定も許可（履歴管理用）

### 2. 目標一覧・ダッシュボード画面

#### レイアウト構成

```txt
┌─────────────────────────────────────┐
│ フィルター: [全て|負債|月間] [アクティビティ] │
├─────────────────────────────────────┤
│ 負債目標一覧                          │
│ ┌─────────────────────────────────┐   │
│ │ 📉 腕立て伏せ (日次10回)          │   │
│ │ 残高: -5 (負債5日分)             │   │
│ │ 開始: 2024-01-01 〜             │   │
│ └─────────────────────────────────┘   │
├─────────────────────────────────────┤
│ 月間目標一覧                          │
│ ┌─────────────────────────────────┐   │
│ │ 📈 読書 (2024年1月: 300ページ)    │   │
│ │ 進捗: 150/300 (50%) 残り16日    │   │
│ │ 必要ペース: 9.4ページ/日          │   │
│ └─────────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### 負債目標の表示

```tsx
interface DebtGoalCard {
  title: string              // アクティビティ名 + 日次目標
  currentBalance: number     // 現在の残高
  balanceStatus: 'debt' | 'savings' | 'neutral'
  totalDebt: number         // 累積負債
  totalActual: number       // 累積実績
  daysActive: number        // 稼働日数
  dailyTarget: number       // 日次目標
  isActive: boolean         // アクティブ状態
}
```

**視覚的表現**:

- **負債状態**: 赤色、警告アイコン、「-5日分の負債」
- **貯金状態**: 緑色、チェックアイコン、「+3日分の貯金」
- **中立状態**: グレー、「目標達成中」
- **進捗バー**: 累積実績 vs 累積負債の比率

#### 月間目標の表示

```tsx
interface MonthlyGoalCard {
  title: string              // アクティビティ名 + 対象月
  progressRate: number       // 進捗率 (0-1)
  currentQuantity: number    // 現在実績
  targetQuantity: number     // 目標量
  remainingQuantity: number  // 残り必要量
  remainingDays: number      // 残り日数
  dailyPaceRequired: number  // 必要日割りペース
  isAchieved: boolean       // 達成済み
}
```

**視覚的表現**:

- **円形進捗バー**: パーセンテージ表示
- **達成済み**: 緑色、100%+、トロフィーアイコン
- **順調**: 青色、ペースが適切
- **要注意**: オレンジ色、ペースが遅れ気味
- **危険**: 赤色、大幅にペース遅れ

### 3. データ更新と同期

#### リアルタイム更新

- アクティビティログが追加/更新された際の自動再計算
- 目標の残高・進捗の自動更新
- WebSocket または polling での定期更新

#### 状態管理

```tsx
// React Query / SWR を使用した例
const { data: goals, mutate } = useGoals({
  type: filter.type,
  activityId: filter.activityId
})

const createGoal = useMutation(createGoalAPI, {
  onSuccess: () => mutate() // キャッシュ更新
})
```

### 4. UX改善提案

#### インタラクティブ要素

- **目標カードクリック**: 詳細画面への遷移
- **スワイプ操作**: 編集/削除アクション（モバイル）
- **ドラッグ&ドロップ**: 目標の並び替え

#### 通知機能

- **負債警告**: 負債が一定額を超えた場合
- **達成通知**: 月間目標達成時
- **リマインダー**: 日次目標の進捗が遅れた場合

#### 分析・統計

- **トレンドグラフ**: 負債残高の推移
- **達成率統計**: 月次・年次の目標達成率
- **パフォーマンス分析**: アクティビティ別の成功率

### 5. 技術実装ガイド

#### 型定義

```typescript
// types/goal.ts
export type GoalType = 'debt' | 'monthly'

export interface BaseGoal {
  id: string
  userId: string
  activityId: string
  activityName: string
  description: string | null
}

export interface DebtGoal extends BaseGoal {
  type: 'debt'
  dailyTargetQuantity: number
  startDate: string
  endDate: string | null
  isActive: boolean
  balance: DebtBalance
}

export interface MonthlyTargetGoal extends BaseGoal {
  type: 'monthly'
  targetQuantity: number
  targetMonth: string
  progress: GoalProgress
}

export type Goal = DebtGoal | MonthlyTargetGoal
```

#### API クライアント

```typescript
// api/goals.ts
export const goalAPI = {
  getGoals: (params?: GetGoalsParams) => 
    fetch('/api/goals?' + new URLSearchParams(params)),
  
  getGoal: (type: GoalType, id: string) => 
    fetch(`/api/goals/${type}/${id}`),
  
  createDebtGoal: (data: CreateDebtGoalRequest) =>
    fetch('/api/goals/debt', { method: 'POST', body: JSON.stringify(data) }),
  
  createMonthlyGoal: (data: CreateMonthlyGoalRequest) =>
    fetch('/api/goals/monthly', { method: 'POST', body: JSON.stringify(data) })
}
```

#### カスタムフック

```typescript
// hooks/useGoals.ts
export function useGoals(filters?: GoalFilters) {
  return useQuery({
    queryKey: ['goals', filters],
    queryFn: () => goalAPI.getGoals(filters),
    refetchInterval: 60000 // 1分毎に更新
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (goal: CreateGoalRequest) => {
      return goal.type === 'debt' 
        ? goalAPI.createDebtGoal(goal)
        : goalAPI.createMonthlyGoal(goal)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    }
  })
}
```

## まとめ

この目標機能は、異なる2つの目標設定アプローチを統合し、ユーザーの多様なニーズに対応します。フロントエンドでは直感的で視覚的にわかりやすいUIを提供し、リアルタイムでの進捗確認と目標管理を実現してください。 
