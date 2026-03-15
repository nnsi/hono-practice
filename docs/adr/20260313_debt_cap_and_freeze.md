# Debt キャップ + Debt フリーズ

## ステータス

決定

## コンテキスト

プロダクト戦略議論（3/12）で、Actiko の差別化を検証した。記録モードは競合（Habitify: boolean/numeric/timer、Loop Habit Tracker: boolean/numeric + カスタム刻み幅）にも存在し、音声+AI（Habit Chat, Habit Driven）やウィジェット（Dots, Habit Tracker Widget）も2026年のトレンドとして競合がある。いずれもパリティ機能（最低限揃えるべき機能）であり、Actiko を選ぶ理由にはならない。

唯一、「未達分が負債として蓄積し、翌日以降の超過で返済できる」Debt モデルを持つ習慣記録アプリは見つからなかった。**Debt システムが Actiko 唯一の明確な差別化軸**。

`docs/plan/debt-continuation-ideas.md` では「記録が続かない」要因を5つに分解し（報酬ゼロ、完璧主義の罠、負債の絶望、何をすればいいか不明、飽き）、各要因に対する Debt ベースのアイデアを Tier 1〜3 に優先度付けしている。Tier 1 として以下の4機能を実装する:

- **3-A. Debt キャップ**: 負債の上限値を設定し、際限なく溜まるストレスを軽減（要因3: 負債が溜まりすぎて絶望する）
- **3-C. Debt フリーズ**: 旅行・体調不良時に目標を一時停止し、不可抗力で負債が溜まるのを防止（要因3: キャップが「事後の救済」に対し、フリーズは「事前の予防」）
- **1-A. 記録フィードバック**: 記録直後に負債の変化をトースト表示（要因1: 記録しても何も返ってこない）
- **2-B. 部分達成**: 目標未達でも記録があれば負債の増加を抑制（要因2: 途切れたら「もういいや」）

Debt フリーズは身内が「目標を捨てて作り直した」というリアルな体験から優先度を Tier 4 → Tier 1 に引き上げた。

なお、Tier 2（回復ストリーク、完済演出、Surplus可視化）は **記録直後** の画面で体験させる方針。Actiko のユーザーは「やった後にアプリを開いて記録する」フローが主であり、「やる前に開いて何をするか決める」前提の施策（Debt優先ダッシュボード等）はユーザーフローと合わないため Tier 2.5 に格下げされた。

## 決定事項

### Debt キャップ

`activity_goal` テーブルに `debt_cap numeric` (nullable) を追加。`calculateGoalBalance()` の戻り値 `GoalBalanceResult` に `rawBalance` と `debtCapped` を追加し、`rawBalance` を `debtCap` でクランプした値を `currentBalance` として返す。`debtCap: null` の場合はキャップなし（従来通り）。

### Debt フリーズ

新テーブル `activity_goal_freeze_period` を作成:

```sql
CREATE TABLE activity_goal_freeze_period (
  id uuid PRIMARY KEY,
  goal_id uuid REFERENCES activity_goal(id),
  user_id uuid REFERENCES "user"(id),
  start_date date NOT NULL,
  end_date date,          -- null = 終了日未定（継続中）
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz  -- soft delete
);
```

`calculateGoalBalance()` の第4引数 `freezePeriods` で受け取り、`countActiveDays()` でフリーズ日を除外した有効日数を区間演算で算出。デフォルト `[]` で後方互換。

#### 「再開する」の意味論

- `endDate` は inclusive（その日を含む）。ドメイン計算 `countActiveDays` で `diff + 1` としている。
- 「再開する」を押した場合:
  - `startDate === 今日`: フリーズ不要なので期間ごと削除
  - `startDate < 今日`: `endDate` を昨日にセット（= 今日からアクティブ）

### 記録フィードバック

`calculateDebtFeedback()` を domain 層に追加。`calculateGoalBalance()` を before/after で2回呼んで差分を出す純粋関数。複数ゴールがある場合は全 active goals をループし、`goalLabel` 付きの配列を返す。

UI はモジュールレベルのイベントバス (`emitDebtFeedback`/`onDebtFeedback`) でトースト表示。React Context を使わず、LogFormBody とトーストコンポーネントを疎結合にした。

### 実装順序

```
Phase 1: Debt キャップ — データモデルと計算ロジック変更
Phase 2: Debt フリーズ — 新テーブル + 計算ロジック再修正
Phase 3: 記録フィードバック + 部分達成 — UI層、Phase 1-2 を消費するだけ
```

「データモデルを先に固めてからUIを作る」順序。UI を先に作ると計算変更のたびに改修が必要になるため。

## 結果

- Debt が「溜まりすぎて絶望する」「不可抗力で壊れる」という2大離脱要因に対処
- 記録直後のフィードバックにより、Debt 返済の達成感が即座に得られる
- backend に新 feature module (goalFreezePeriod) が route/handler/usecase/repository の4層構造で追加
- frontend-v2 / mobile-v2 の両方に FreezePeriodManager UI を実装
- sync エンジンに `syncGoalFreezePeriods` を追加。`syncGoals` → `syncGoalFreezePeriods` は直列実行（FK 依存のため）

## 備考

- フィードバックのトースト表示で Animated.View を使っているが、Windows のアクセシビリティ設定でアニメーションが無効化されていると React Native Web 上で opacity 0 のまま表示されない。ネイティブでは問題ないはず。
- `calculateDebtFeedback` が純粋関数であることで、テストが before/after のフィクスチャを渡すだけで書ける。Phase 1-2 で計算ロジックを固めた恩恵。
