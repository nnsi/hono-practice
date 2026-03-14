# Debt キャップ + Debt フリーズ

## ステータス

決定

## コンテキスト

プロダクト戦略議論（3/12）で、記録モード・音声AI・ウィジェットは競合にも存在するパリティ機能であり、Debt システムが Actiko 唯一の差別化軸であると整理された。Debt の価値を強化するため、`debt-continuation-ideas.md` の Tier 1 として以下の4機能を実装する:

- **3-A. Debt キャップ**: 負債の上限値を設定し、際限なく溜まるストレスを軽減
- **3-C. Debt フリーズ**: 旅行・体調不良時に目標を一時停止し、不可抗力で負債が溜まるのを防止
- **1-A. 記録フィードバック**: 記録直後に負債の変化をトースト表示
- **2-B. 部分達成**: 目標未達でも記録があれば負債の増加を抑制（フィードバック内で表現）

Debt フリーズは身内が「目標を捨てて作り直した」というリアルな体験から優先度を Tier 4 → Tier 1 に引き上げた。

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
