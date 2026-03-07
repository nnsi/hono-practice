# オフラインファースト即UI表示: エッジケース分析

> 調査日: 2026-03-08
> 調査対象: frontend-v2 の「auth後回し・即UI表示」改修に伴うリスク分析
> 調査手法: Claude サブエージェント3並列 + Codex(gpt-5.4)

## 背景

本番のActikoはロード画面表示が2〜3秒かかる。原因は `useAuth` が全APIリクエスト完了まで `isLoading=true` でUIをブロックしているため。

### 現状のロードフロー

```
POST /auth/token  (avg 763ms, 72%がコールドスタート)
  ↓ 直列
GET /user/me      (avg 250ms)
  ↓ 直列
Promise.all([     ← ここから並列
  GET /v2/activities      (avg 378ms)
  GET /v2/activity-logs   (avg 248ms)
  GET /v2/goals           (avg 245ms)
  GET /v2/tasks           (avg 222ms)
])
```

ウォーム時は合計~680ms、コールドスタート時は2〜3.6秒。`/auth/token` がWorker+Neonのコールドスタート起点になっており、72%がコールド。

### 改修案

Dexieにキャッシュがあれば即UI表示し、auth/syncは完全にバックグラウンドで実行する。変更箇所は `useAuth.ts`（1時間制限撤廃）、`__root.tsx`（isLoadingゲート緩和）、`SettingsPage.tsx`（API fetch非同期化）の3ファイル。

既に `tryOfflineAuth` 成功時（キャッシュ<1時間）は即UI表示→バックグラウンドsyncのパスがあるため、そのパスを常時有効にする形。

---

## エッジケース一覧

### HIGH: 対応必須

#### H1: `upsertFromServer` の `bulkPut` が pending レコードを無条件上書き ✅ 修正済み (2026-03-08)

- **既存バグ（現状でも発生しうる）**
- **発見元**: サブエージェント + Codex
- **対象コード**: `activityLogRepository.ts:91-95`, `activityRepository.ts:329-335`, `goalRepository.ts:89-93`, `taskRepository.ts:101-105`

**問題**: `performInitialSync` がサーバーデータを受け取り `bulkPut` でDexieに書く際、`_syncStatus: "pending"` のレコードをタイムスタンプ比較なしで無条件上書きする。

**影響**:
- ユーザーが作成したデータが一時的にDexieから消失（useLiveQuery経由でUIからも消える）
- ソフトデリートしたデータが復活する
- 更新したデータが古い値に巻き戻る

**発生条件**:
1. UIが表示されている（現状: キャッシュ<1時間 / 改修後: キャッシュあり全て）
2. バックグラウンドで `performInitialSync` が走っている
3. その間にユーザーがデータを作成・更新・削除

**緩和要因**: push syncが次サイクル（最大30秒）でpending分をサーバーにPOSTし、バックエンドは `updatedAt` ベースの競合解決があるため、データは最終的に復元される。ただしUI上は一時的に消失する。

**修正案**:
```typescript
async upsertActivityLogsFromServer(logs) {
  const pendingIds = new Set(
    await db.activityLogs.where("_syncStatus").equals("pending").primaryKeys()
  );
  const safe = logs.filter(l => !pendingIds.has(l.id));
  await db.activityLogs.bulkPut(
    safe.map(log => ({ ...log, _syncStatus: "synced" })),
  );
}
```
全4リポジトリ（activityLog, activity, goal, task）に同じパターンを適用する。

---

#### H2: 別アカウントのキャッシュ露出 + データ漏洩 ✅ 修正済み (2026-03-08)

- **既存リスク（現状のキャッシュ<1時間パスでも存在）**
- **発見元**: Codex + 追加分析

**問題**: Dexieに User A のデータがある状態で、cookie（refresh token）が User B のものに差し替えられた場合:

1. `tryOfflineAuth()` → User AのauthStateで即UI表示
2. バックグラウンドで `serverRefreshAndSync()` → User Bのtokenを取得
3. `syncAll()` が User B のtokenで発火 → **User Aのpendingデータが User Bのアカウントにpush**される
4. `syncWithUserCheck` がuserId不一致を検知 → `clearLocalData()` → 最終的にUser Bのデータに切り替わる

ステップ3で**User Aのデータが User Bに漏洩**する。

**発生条件**: 攻撃者がvictimのブラウザでcookieを差し替えられる必要がある（XSS、物理アクセス、subdomain cookie injection等）。

**修正案**: `serverRefreshAndSync` でtokenのuserIdを取得した時点で、Dexieの `authState.userId` と比較し、不一致ならpush syncを一切実行せず `clearLocalData()` を先に走らせる。

---

#### H3: userId空文字 or 旧ユーザーIDでの書き込み ✅ 修正済み (2026-03-08)

- **即UI表示改修後に発生しうる**
- **発見元**: Codex

**問題**: CRUD操作が `db.authState.get("current")` からuserIdを取る。auth未確定時に `userId: ""` や旧ユーザーのIDでレコードが作成される。

**対象コード**: `activityRepository.ts:40-49`, `goalRepository.ts:24`, `taskRepository.ts:21`

**修正案**: 書き込み時にuserIdが空文字なら例外を投げる or authState確定後のみ書き込み許可。

---

#### H4: ログアウト/アカウント切替時に飛行中のsyncがDexieに書き戻す ✅ 修正済み (2026-03-08)

- **既存リスク**
- **発見元**: Codex

**問題**: `clearLocalData()` と `syncAll()` に協調メカニズムがない。User Aのsyncリクエストが完了→User Bに切替後のDBに書き込まれる。

**対象コード**: `syncEngine.ts:25`, `initialSync.ts:21`

**修正案**: syncEngineにキャンセル機構（世代番号 or AbortController）を追加。`clearLocalData` 実行時にインフライトのsyncを無効化する。

---

#### H5: push失敗がsyncEngine上は成功扱い ✅ 修正済み (2026-03-08)

- **既存バグ**
- **発見元**: Codex

**問題**: 各sync関数は `!res.ok` で `return`（throwしない）。`syncAll()` のcatchに入らず `retryCount = 0` にリセットされる。pendingデータが30秒間隔でしかリトライされない（バックオフが効かない）。

**対象コード**: `syncEngine.ts:36-37`, `syncActivityLogs.ts:18`, `syncGoals.ts:18`, `syncTasks.ts:18`

**修正案**: sync関数が失敗時にthrowする or syncAllがreturn値で失敗を検知する。

---

### MEDIUM: 体験劣化。許容判断が必要

#### M1: initialSyncがテーブルごとに個別書き込み → 中間状態がuseLiveQueryに露出

- **発見元**: Codex

**問題**: `performInitialSync()` は4エンドポイントを並列fetchし、レスポンスごとに個別にDexieに書き込む。テーブル間のアトミシティがないため、「新しいgoals + 古いlogs」のような中間状態が `useLiveQuery` で描画される。

**影響**: GoalBalance等の計算が一瞬おかしい値になる。

**対象コード**: `initialSync.ts:66-119`, `useStatsPage.ts:37-62`, `GoalCard.tsx:98-121`

**緩和要因**: 全テーブル書き込み完了後に `useLiveQuery` が再発火し正しい値になる。体感は数百ms以内のフリッカー。

---

#### M2: Stats/Goalの計算がstaleキャッシュベース

- **発見元**: Codex + サブエージェント

**問題**: Stats/Goal画面はDexieのデータから直接計算する（`calculateGoalBalance`, `generateGoalLines`等）。sync完了前は古いデータベースの値が「正しい値」として表示される。

**影響**: 数値がsync完了時にジャンプする（例: 昨日のログが反映されていない状態で目標達成率が低く見える）。

**対処案**: sync中インジケータを表示 or sync完了後に再計算を明示的にトリガー。

---

#### M3: 複数タブで同じpendingレコードを同時push

- **発見元**: Codex

**問題**: Dexie（IndexedDB）は全タブで共有されるが、`accessToken` はタブごとにメモリ保持。`startAutoSync()` にリーダー選出がなく、全タブが独立して30秒ごとにsyncを実行する。

**影響**: 同じpendingレコードが複数タブから重複pushされる。

**緩和要因**: バックエンドのsync endpointは `onConflictDoUpdate` + `updatedAt` 比較なので、重複pushは冪等。実害はAPIコストの無駄のみ。

**対処案（将来）**: `BroadcastChannel` API or Dexie の `Dexie.on('changes')` でリーダー選出。

---

#### M4: チャンク途中の失敗でサーバー適用済み + ローカルpendingの乖離

- **発見元**: Codex

**問題**: syncのチャンクループで `chunk[0]` 成功 → `chunk[1]` 失敗 → `return` で全件のmark処理がスキップされる。`chunk[0]` 分はサーバーに反映済みだがローカルは `_syncStatus: "pending"` のまま。

**対象コード**: `syncActivities.ts:27`, `syncActivityLogs.ts:16`, `syncGoals.ts:18`

**緩和要因**: 次回syncで再送されるが、バックエンドは冪等なので実害なし。ただしsyncEngine上は成功扱い（H5と関連）。

---

### LOW: 軽微。対応は任意

#### L1: bulkPut中にuseLiveQueryが一瞬空配列を返すフリッカー

- **発見元**: Codex + サブエージェント

**問題**: hooks が `?? []` でフォールバックしているため、Dexieテーブルの書き換え中に `useLiveQuery` が一瞬 `undefined` → `[]` を返し、空表示が描画される可能性。

**対象コード**: `useActivities.ts:10`, `useGoals.ts:10`, `useTasks.ts:13`

**緩和要因**: `bulkPut` はテーブルをclear→refillではなくupsertなので、実際にはほとんど発生しない。`clearLocalData` 時のみ一瞬空になる可能性あり。

---

## 同期エンジンの仕様メモ

調査中に確認した同期エンジンの動作をここに記録する。

### リトライ・スケジューリング

| 項目 | 値 |
|------|-----|
| デフォルトポーリング間隔 | 30秒 |
| 失敗時バックオフ | `2^retryCount × 1000ms`、最大5分 |
| 成功時 | `retryCount = 0` にリセット |
| ミューテックス | `isSyncing` フラグで並行実行防止 |
| ネットワーク復帰 | `online` イベントで即時sync |

### syncAll() 実行順序

```
1. syncActivityIconDeletions()  ← アイコン削除を先に
2. syncActivities()             ← アクティビティ本体
3. syncActivityIcons()          ← アイコンアップロード
4. Promise.all([                ← 残りは並列
     syncActivityLogs(),
     syncGoals(),
     syncTasks(),
   ])
```

### データフロー

- **ローカル書き込み**: Dexie即時 + `_syncStatus: "pending"` → `syncEngine.syncX()` 非同期発火
- **サーバー→ローカル**: `performInitialSync` で起動時に1回pull。以降はpush syncの `serverWins` レスポンスでのみ更新
- **競合解決**: サーバー側で `updatedAt` タイムスタンプ比較（Last-Write-Wins）
- **リアルタイムpull**: なし（WebSocket/SSE未使用）

### _syncStatus 状態遷移

```
作成/更新 → "pending"
  ├→ sync成功 → "synced"
  ├→ サーバー競合（serverWins） → "synced"（サーバー版で上書き）
  └→ sync失敗 → "failed"（次回syncでリトライされない ※H5に関連）
```

---

## 優先度まとめ

| 優先 | ID | 内容 | 既存バグ？ | 改修で悪化？ | ステータス |
|------|----|------|-----------|------------|-----------|
| 1 | H1 | bulkPutのpending上書き | Yes | ウィンドウ拡大 | ✅ 修正済み |
| 2 | H5 | push失敗が成功扱い | Yes | 変化なし | ✅ 修正済み |
| 3 | H2 | 別アカウントデータ漏洩 | Yes（1h以内） | ウィンドウ拡大 | ✅ 修正済み |
| 4 | H4 | 飛行中syncの書き戻し | Yes | 変化なし | ✅ 修正済み |
| 5 | H3 | 空userId書き込み | No | 新規発生 | ✅ 修正済み |
| 6 | M1-M4 | 体験劣化系 | 部分的 | 頻度増加 | 未着手 |
| 7 | L1 | フリッカー | 部分的 | 頻度増加 | 未着手 |
