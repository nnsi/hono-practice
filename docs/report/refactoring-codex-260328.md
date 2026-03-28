# A+品質化リファクタリング計画

作成日: 2026-03-28
対象: `apps/backend`, `apps/frontend`, `apps/mobile`, `packages/*`
前提:
- `pnpm tsc` は通過
- `pnpm test-once` は通過
- 現状は「十分に良い」が、「壊れにくさ」「調査しやすさ」「直しやすさ」で A+ までは届いていない

## 1. 現状評価

| 領域 | 現状 | A+ に足りないもの |
| --- | --- | --- |
| API / Backend | B+ | ユースケースの肥大化、一部未完 TODO、運用観測の弱さ |
| Frontend | B+ | 失敗時の UI 復帰保証、非原子的な状態遷移、複雑フローの整理 |
| Mobile | B | ローカル DB と同期と認証の複雑さに対してテストが薄い |
| 共通コード | A- | shared hook の失敗耐性、契約の明文化、境界テストの厚み |

## 2. A+ の定義

A+ にする条件は「機能が多い」ことではなく、次の4点が揃うこと。

1. 失敗しても状態が壊れない
2. 壊れても原因を 10 分以内に追える
3. 変更時に影響範囲が読める
4. 主要フローがテストで固定されている

この基準で見ると、最優先は次の4件。

1. Task 完了と ActivityLog 作成の整合性を保証する
2. shared form / auth init の silent failure を減らす
3. Mobile の repository / auth / sync の結合点を分割する
4. Backend の auth / api key を運用可能な粒度まで整理する

## 3. API / Backend を A+ にする案

### 3.1 目標

- route, handler, usecase, repository の分離を維持したまま、巨大 usecase を分割する
- multi-write 処理のトランザクション境界を明示する
- silent failure と TODO を残さない
- 障害時に request 単位で追跡できる

### 3.2 具体施策

#### A. `authUsecase.ts` を責務分割する

対象:
- `apps/backend/feature/auth/authUsecase.ts`

分割案:
- `issueSession.ts`
- `rotateSession.ts`
- `loginWithPassword.ts`
- `loginWithProvider.ts`
- `linkProvider.ts`
- `logout.ts`

実施内容:
- access token / refresh token 発行を単独モジュール化する
- provider login と provider link の共通検証を `verifyProviderCredential.ts` に寄せる
- refresh token rotate の DB 書き込み方針を 1 箇所に閉じる
- `fireAndForgetFn` をユースケース外の orchestration に逃がし、業務ロジックから非同期副作用を追い出す

完了条件:
- `authUsecase.ts` が façade のみになる
- 各ユースケースが 150 行未満になる
- login / refresh / logout / provider login / provider link の失敗パターンごとに単体テストが揃う

#### B. API key 周りの未完了項目を潰す

対象:
- `apps/backend/feature/apiKey/apiKeyUsecase.ts`

実施内容:
- KV キャッシュを入れるなら lookup / set / invalidate をまとめた adapter を先に作る
- キャッシュを入れないなら TODO を消し、DB only と明文化する
- `lastUsedAt` 更新失敗を `console.error` ではなく logger / tracer / error reporter に流す
- API key validation の success / inactive / deleted / cache stale をテストで固定する

完了条件:
- TODO が 0
- validation 経路の観測先が統一される
- 運用時に「認証失敗か DB 失敗か更新失敗か」をログから区別できる

#### C. multi-write usecase を transaction runner 前提で棚卸しする

対象候補:
- auth
- activity icon
- goal / freeze period
- task と周辺関連処理

実施内容:
- 複数テーブル更新がある usecase を一覧化する
- 「完全に atomic にすべき処理」と「補償処理でよい処理」を分ける
- transaction が必要な usecase は route / handler 層ではなく usecase 層で閉じる
- rollback のテストを追加する

完了条件:
- 複数書き込み処理に設計メモがある
- atomic 要件のある処理に transaction test がある

#### D. 監視とログをプロダクト運用向けに整える

実施内容:
- `requestId`, `userId`, `feature`, `phase`, `dbMs`, `extMs` の出力を主要経路で揃える
- 4xx と 5xx の分類基準を固定する
- 想定済み失敗は warn、未想定失敗は error に統一する
- background failure の出力形式を共通化する

完了条件:
- 主要 feature のログ項目が揃う
- エラー時に trace と request log がつながる

### 3.3 優先順

1. auth 分割
2. API key TODO 解消
3. multi-write usecase 棚卸し
4. ログ整備

## 4. Frontend を A+ にする案

### 4.1 目標

- ユーザー操作の失敗時に UI が壊れない
- 画面フックが業務トランザクションを抱え込まない
- auth bootstrap と sync の失敗が見える
- Web の強い E2E をさらに「壊れ方のテスト」に寄せる

### 4.2 具体施策

#### A. shared form の送信処理を失敗安全にする

対象:
- `packages/frontend-shared/hooks/useLogForm.ts`
- `apps/frontend/src/components/common/useLogForm.ts`

実施内容:
- `setIsSubmitting(true)` の後は必ず `try/finally` にする
- `saveLog` の失敗時に `onDone()` を呼ばない
- フォーム用の `submitState: idle | submitting | error | success` を導入する
- 画面に再送導線を出せる形にする

完了条件:
- createActivityLog が throw しても submit 状態が復帰する
- 失敗時の UI 挙動が unit test で固定される

#### B. Task 完了処理を UI フックから切り離す

対象:
- `packages/frontend-shared/hooks/useTasksPage.ts`

実施内容:
- `handleToggleDone` で直接 `taskRepository.updateTask` と `activityLogRepository.createActivityLog` を呼ばない
- `completeTaskWithActivityLog` / `undoTaskCompletion` の usecase を shared 層に新設する
- 片方だけ成功したケースの補償方針を決める
- task 完了時の activity log 生成は transaction か idempotent compensating action に寄せる

完了条件:
- UI hook が orchestration ではなく event handler だけを持つ
- 「task は done だが log がない」状態を作らない
- 完了 / 失敗 / リトライのテストがある

#### C. auth bootstrap を state machine 化する

対象:
- `apps/frontend/src/hooks/useAuthInit.ts`

実施内容:
- `idle -> offline-restored -> refreshing -> synced -> failed` の状態を明示する
- silent catch を減らし、握りつぶす場合も reason を記録する
- `window.online` 再試行の登録解除条件をテストで固定する
- auth 期限切れ、初回起動、オフライン復帰を別モジュールに切る

完了条件:
- auth 初期化の状態遷移図が書ける
- offline login / refresh failure / retry success のテストがある

#### D. E2E を正常系中心から回帰防止中心へ寄せる

実施内容:
- API 失敗時に submit ボタンが復帰すること
- task 完了と日次ログ反映がずれないこと
- auth refresh 失敗時に壊れたログイン状態にならないこと
- sync 中でも主要画面が落ちないこと

完了条件:
- 「落ちない」「二重登録しない」「復帰できる」を確認する E2E が入る

### 4.3 優先順

1. useLogForm の失敗安全化
2. task 完了 usecase 切り出し
3. auth bootstrap state machine 化
4. E2E の失敗系追加

## 5. Mobile を A+ にする案

### 5.1 目標

- 認証、同期、ローカル DB、AppState の結合を弱める
- repository の巨大ファイルを分割する
- Mobile 固有の回帰を test で抑える
- オフライン前提の挙動を仕様として固定する

### 5.2 具体施策

#### A. `useAuthInit.ts` を 4 モジュールに分割する

対象:
- `apps/mobile/src/hooks/useAuthInit.ts`

分割案:
- `restoreOfflineSession.ts`
- `refreshSessionAndSync.ts`
- `registerOnlineRetry.ts`
- `registerForegroundPlanSync.ts`

実施内容:
- auth 初期化と plan 同期と voice key 取得を分離する
- `catch {}` をなくし、無視する失敗も `reportError` に寄せる
- `setOnAuthExpired` の logout side effect を専用関数に切り出す
- generation guard の意図をヘルパー化して再利用する

完了条件:
- hook 本体は組み立てだけになる
- offline restore / token refresh / app foreground / auth expired のテストがある

#### B. SQLite repository を table 単位で分割する

対象:
- `apps/mobile/src/repositories/activityRepository.ts`

分割案:
- `activityRowMapper.ts`
- `activitySql.ts`
- `activityKindSql.ts`
- `activityIconSql.ts`
- `activitySyncSql.ts`
- `activityRepository.ts`

実施内容:
- row mapper, SQL 発行, repository adapter を分離する
- transaction ヘルパーを共通化する
- `BEGIN/COMMIT/ROLLBACK` の定型コードを wrapper 化する
- raw SQL の変更点をテストで守る

完了条件:
- 1 ファイル 250 行超の repository が消える
- mapper 単体テストと SQL integration test がある

#### C. Mobile 固有テストを増やす

対象:
- auth
- sync
- local repository
- network timeout / refresh retry

実施内容:
- fake DB + fake network adapter で repository integration test を追加する
- `apiClient.ts` の timeout, refresh, 401 retry, refresh fail を固定する
- `AppState` 復帰時の plan refresh と voice key provisioning をテストする
- icon cache, blob sync, delete queue の回帰テストを追加する

完了条件:
- mobile 直下のテスト件数を現状の約 2 倍まで増やす
- auth / sync / repository の主要ケースが手元で再現できる

#### D. Offline-first の仕様書を作る

実施内容:
- 何を即時反映し、何を pending にし、何を failed にするかを明文化する
- 401, 403, timeout, offline の扱いを画面と data layer で揃える
- sync retry と手動復旧導線の責務を決める

完了条件:
- 「Mobile の正しい挙動」が口頭でなく文書で定義される
- 画面実装と repository 実装の矛盾が減る

### 5.3 優先順

1. useAuthInit 分割
2. apiClient の境界テスト追加
3. activityRepository 分割
4. offline-first 仕様の明文化

## 6. 共通コードを A+ にする案

### 6.1 目標

- shared に寄せた判断をさらに正しくする
- domain / shared / platform adapter の境界を固定する
- shared hook が UI 事故を起こさないようにする
- sync の契約を明示する

### 6.2 具体施策

#### A. shared hook を「状態遷移が見える設計」に変える

対象:
- `packages/frontend-shared/hooks/*`

実施内容:
- 重要 hook から boolean state を減らし、状態 enum 化する
- UI 層が必要とする `error`, `canRetry`, `phase` を返す
- side effect と derived state を分離する

優先対象:
- `useLogForm`
- `useTasksPage`
- auth 系 shared 化候補

完了条件:
- boolean の組み合わせでしか読めない hook が減る
- 失敗時の UI 実装が分岐しやすくなる

#### B. usecase / repository / adapter の契約を固定する

対象:
- `packages/frontend-shared/repositories/*`
- `packages/domain/*`
- `packages/sync-engine/*`

実施内容:
- repository interface ごとに「成功」「一時失敗」「恒久失敗」の扱いを定義する
- idempotent であるべきメソッドを明示する
- sync-engine から見た依存順序を ADR か設計メモに起こす
- adapter 実装間で揃えるべき契約をテスト化する

完了条件:
- Web と Mobile の adapter 差分が仕様違反を生みにくくなる
- shared repository の contract test がある

#### C. sync-engine を「順序あり実行」から「仕様あり実行」に上げる

対象:
- `packages/sync-engine/orchestration/createSyncEngine.ts`

実施内容:
- phase ごとに依存理由をコードコメントではなく仕様として残す
- partial success 時の retry policy を明文化する
- metrics hook を入れて phase 単位の成功率を見られるようにする
- `syncAll` のテストに partial success / all fail / flaky network を追加する

完了条件:
- sync 順序を変更すると壊れる理由が明確になる
- retry が実装依存ではなく仕様依存になる

#### D. domain の境界条件テストを増やす

対象:
- goal balance
- day target
- debt cap
- task grouping
- sync helper

実施内容:
- プロパティベーステストかテーブルテストで境界条件を厚くする
- 日付またぎ、 freeze period, null quantity, negative balance, empty data を重点的に固定する
- shared logic の「壊れやすい条件」を一覧化する

完了条件:
- ドメインロジック変更時の不安が減る
- 日付系の不具合を E2E まで持ち込まない

### 6.3 優先順

1. useLogForm / useTasksPage の状態遷移見直し
2. repository contract の明文化
3. sync-engine の仕様化
4. domain 境界テスト拡充

## 7. 横断施策

### 7.1 silent catch を原則禁止にする

対象:
- Web auth init
- Mobile auth init
- API key lastUsedAt
- icon cache
- 各種 sync retry

ルール:
- 握りつぶすなら理由を書く
- 握りつぶすなら観測先に送る
- UX 上無視する失敗と、実装上見逃している失敗を分ける

### 7.2 「壊れない」系テストを増やす

追加したい観点:
- throw した時に loading / submitting が戻る
- 片方だけ成功した時に補償される
- offline -> online で二重反映しない
- refresh token の失敗で中途半端な auth state を残さない

### 7.3 ホットスポット管理ルールを入れる

基準:
- 300 行超の hook / usecase / repository は分割候補
- 3 つ以上の外部依存を直接触る関数は orchestration とみなす
- UI 層が repository を 2 つ以上またぐなら shared usecase 化する

## 8. 実行順

### Phase 1: 品質事故の芽を潰す

1. `packages/frontend-shared/hooks/useLogForm.ts` の failure-safe 化
2. `packages/frontend-shared/hooks/useTasksPage.ts` から task 完了 orchestration を分離
3. `apps/backend/feature/apiKey/apiKeyUsecase.ts` の TODO 解消

### Phase 2: 認証と同期の複雑性を下げる

1. `apps/frontend/src/hooks/useAuthInit.ts` の state machine 化
2. `apps/mobile/src/hooks/useAuthInit.ts` の分割
3. `apps/mobile/src/utils/apiClient.ts` の境界テスト追加
4. `packages/sync-engine` の仕様化

### Phase 3: 大型ファイルを分解する

1. `apps/backend/feature/auth/authUsecase.ts` 分割
2. `apps/mobile/src/repositories/activityRepository.ts` 分割
3. shared repository contract test 追加

### Phase 4: A+ に仕上げる

1. 失敗系 E2E の追加
2. offline-first 仕様書の整備
3. domain 境界テストの拡充
4. ログ / metrics の最終統一

## 9. 完了判定

次の状態になったら A+ 判定に近い。

- 主要操作で partial success が発生しない
- submitting / loading が stuck しない
- auth / sync / offline の挙動が文書とテストで固定されている
- backend の運用 TODO が消えている
- Mobile の主要 repository と auth の回帰を単体と統合テストで拾える
- shared code の契約が Web / Mobile で揃っている

## 10. 結論

現状のコードは「AI に全部書かせたコード」としてかなり良い。A+ に上げるために必要なのは全面書き直しではなく、次の3つに尽きる。

1. 複数状態をまたぐ処理を atomic にする
2. silent failure を観測可能にする
3. Mobile と shared の境界に厚いテストを置く

この3点を順に潰せば、品質はかなり高い水準まで持っていける。
