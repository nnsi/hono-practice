# やりたいことリスト

- CI/CD整える
- リリース（できれば無料で）
- 定量目標設定
- レスポンシブ対応
- スマホアプリ
- monorepo化

## 目標設定

- 到達したいこと
- 到達したい数値
  - 目標到達のためには複数の数値目標を設定する可能性がある
- 目標到達に必要な活動
  - 活動の定量値と到達したい数値は必ずしもイコールではない
  - 複数の活動が結びつく可能性がある
    - 例: ダイエット
      - 目標: xxkg、体脂肪率xx%
      - 活動: ランニングxxKm、RFAxxCal など

### モデルとか

- Goal
  - id: GoalId
  - userId: UserId
  - title: string
  - due: Date
  - quantity: number
  - quantityLabel: string
  - activities: Activity[]
  - activityLogs: ActivityLog[]
  - tasks: Task[]
