# バグ監査チェックリスト（2026-07-17）

6体の並列レビューエージェント（backend logic / backend security / domain・sync / frontend / mobile / admin・tail-worker）による全体監査の結果。
各指摘は親エージェントがコードを確認して採否を判定した。修正完了したらチェックを入れる。

ベースライン: 監査開始時点で `pnpm run test-once` / `pnpm run tsc` は全パス（masterのCI状態はgh CLI不在のため unknown）。

## 修正対象バグ

### domain（時刻ロジック）

- [x] **BUG-1 [medium]** `packages/domain/csv/csvParser.ts:174-180` — `validateDate` が `new Date("YYYY-MM-DD")`（UTC深夜として解釈）を `new Date()`（ローカル現在時刻）と比較しており、JST 00:00〜09:00 の間「今日」の日付を含むCSVインポートが「未来の日付は指定できません」で誤って拒否される。
  - 修正: 日付単位（day granularity）の比較に変更する。regression property test を追加。
- [x] **BUG-2 [medium]** `packages/domain/goal/goalBalance.ts:42,77` / `packages/domain/goal/goalStats.ts` — 日数計算に `dayjs(...).diff(..., "day")`（経過ミリ秒÷86400000の切り捨て）を使用しており、DSTのあるタイムゾーン（米国等）のユーザーで spring-forward を跨ぐ期間の日数が1日過少になる。`totalTarget` が過少になり残高が実際より良く表示される。連続日判定（`diff === 1`）も同様に崩れる。
  - 修正: カレンダー日ベース（TZ非依存）の日数差計算に統一する。property test を追加。

### backend

- [x] **BUG-3 [low]** `apps/backend/feature/auth/authLoginUsecase.ts:26-36` — ユーザー不在時に即throwし、存在時のみbcrypt比較を実行するため、応答時間差でloginIdの存在有無が判別できる（ユーザー列挙のタイミングサイドチャネル）。
  - 修正: ユーザー不在時もダミーハッシュに対してcompareを実行して時間差を消す。
- [x] **BUG-4 [low]** `apps/backend/query/goalQueryService.ts:52` / `apps/backend/feature/activitygoal/activityGoalService.ts:66,87` — `clientDate` 未指定時のフォールバック `dayjs().format("YYYY-MM-DD")` がUTC基準（`lib/dayjs.ts` はdayjs.utc）のため、JST 00:00〜09:00 にclientDate無しで呼ばれると「今日」が1日前にずれ、当日分のログが集計から漏れる。
  - 修正: 当初はJST基準フォールバックで暫定対応したが、ユーザー判断により**clientDateをAPI契約上必須化**（未指定は400）してサーバーが「今日」を推測する経路を根絶した。対象: goal sync `/users/v2/goals`、REST `/users/goals*`、`GET /users/activity-logs`（`date`）、`POST .../from-speech`（body `clientDate`）。Web/Mobileのアプリ内経路は元からclientDateを送信済み。ネイティブウィジェット（Swift/Kotlin）はソース修正済みだが**ネイティブ再ビルド配信までは旧バイナリのボイス記録が400になる**（要EAS Build）。clientDateを送らない旧アプリバイナリ・外部APIキー連携も同様に400化する。
- [x] **BUG-5 [low]** `apps/backend/feature/goal/goalUsecase.ts:66-83` / `apps/backend/feature/activitygoal/activityGoalService.ts:99` — REST `/goals` の `currentBalance` 計算が freezePeriods を渡しておらず、sync経路（`goalSyncUsecase.ts` はfreezeを渡す）と値が食い違う。凍結期間を持つゴールでREST側の残高が誤る。
  - 修正: REST経路でもfreeze periodsを取得して `calculateGoalBalance` に渡す。
- [x] **BUG-6 [low]** `apps/backend/feature/subscription/subscriptionCommandUsecase.ts:64-73` — Webhookの冪等性チェック（`existsByWebhookId`）がトランザクション外で行われるため、同一webhookIdの同時配信で `subscription_histories` に重複行が入り得る（サブスク状態自体はupsertで冪等）。
  - 結果: **調査の結果、既に修正済みだったことが判明**（2026-05-01のマイグレーション `0035_wide_dracula.sql` が部分unique index `subscription_history_webhook_id_uniq` を作成済みで、insertも `onConflictDoNothing` 済み）。監査時の指摘が古かった。再発防止として重複webhookIdで履歴が1行になることのテストを追加した。

### frontend / frontend-shared

- [x] **BUG-7 [medium]** `packages/frontend-shared/hooks/useEditLogDialog.ts:52-53` — ログ編集の数量バリデーションが作成系（`useLogForm` 等は `0〜999999` で検査）と非対称で、上限・負値チェックが欠落。編集経由でのみ範囲外の値を永続化できる。
  - 修正: 作成系と同じ範囲チェック（`parsed < 0 || parsed > 999999` で拒否）を追加する。
- [x] **BUG-8 [low]** `apps/frontend/src/components/notes/useNoteDetailPage.ts:77-162` — 新規ノートの `flush` に再入ガードがなく、debounce / visibilitychange / unmount / 戻る操作が `createNote` のawait解決前に重なるとノートが重複作成され得る。
  - 修正: in-flightガード（`isFlushingRef`）を追加して再入を防ぐ。

### mobile

- [x] **BUG-9 [low]** `apps/mobile/src/hooks/useRevenueCat.ts:92-110` — cleanupで `CustomerInfoUpdateListener` を解除するが `initializedRef` をリセットしないため、アンマウントを挟まず `userId` が変化した場合にリスナー再登録も再identifyもされない。
  - 修正: cleanupで `initializedRef.current = false` に戻す。
- [x] **BUG-10 [low]** `apps/mobile/src/db/useLiveQuery.ts:17-37` — `dbEvents` が連続発火した際の out-of-order resolution ガードがなく、遅い古いクエリ結果が新しい結果を上書きして一時的にstaleなデータを表示し得る。
  - 修正: 実行ごとのシーケンストークンを持ち、最新実行以外の結果を破棄する。
- [x] **BUG-11 [low]** `apps/mobile/src/components/goal/useInactiveDates.ts:40-41` — `monthStart` / `monthEnd` が空depsの `useMemo` でマウント時に固定されるため、月を跨いでマウントされ続けると古い月の範囲でクエリし続ける。
  - 修正: `today` propから導出する（depsに `today` を追加）。

### tail-worker

- [x] **BUG-12 [medium]** `apps/tail-worker/src/index.ts:36-72` — `tail()` が `event.logs` のみ処理し `event.exceptions`（未捕捉例外・タイムアウト）を読まないため、当該クラスの障害がWAEに記録されない監視の死角がある。※ADR 20260215 により現在このworkerは `tail_consumers` から外れ休眠中で本番影響なし。将来の復帰時に備えて修正する。
  - 修正: `event.exceptions` をループし `level: "error"` としてWAEに書き込む。

## 調査済み・対応不要と判断した指摘

- `apps/backend/feature/webhook/polarWebhookRoute.ts:96` — 署名検証済みPolarペイロードの `metadata.userId` 信頼。攻撃者が実課金して他人にpremiumを付与できるのみで実害なし（security reviewer判定: not actionable）。
- `apps/backend/utils/getClientIp.ts:11-18` — `x-forwarded-for` フォールバックはCloudflare本番では `cf-connecting-ip` が常に付与されるため到達しない。CF以外でフロントする構成に変えた場合のみ要対応。
- `apps/admin-frontend/src/components/users/SubscriptionForm.tsx:42` の `iso.slice(0, 10)` — バックエンドとの往復が一貫してUTC深夜0時基準のため実害なし（日付ルール違反に見えるが誤検知）。
- `packages/utils/lexicalOrder.ts:72` の括弧位置非対称 — `fromCharCode` の切り捨てにより結果は同一で実害なし。
- `packages/frontend-shared/hooks/useActivityKindEntries.ts` のid採番クロージャ — 同一tick内連続実行の理論的余地のみで実運用で到達せず。
- Web/Mobileのauth transport非対称（過去バグの再発チェック） — mobile logoutのローテーション後トークン再読込・Bearer付与とも一貫しており問題なし。
- backend security全域（認証・認可・インジェクション・Webhook署名・トークンローテーション・CORS/Cookie・R2 proxy）— **レビューエージェント2体（監査時 + multi-review時）の判定として** critical/high/medium該当なし。親による独立した全域再検証は行っていない（個別指摘の裏取りのみ実施）。

## 修正状況

**全12件対応完了**（2026-07-17）。内訳:
- 11件をコード修正（BUG-1〜5, 7〜12）。時刻ロジック（BUG-1/2）はproperty test、backend（BUG-3/5/6）はPGlite統合テスト、frontend（BUG-7/8）はフックテストを追加。BUG-8は修正前実装でテストが失敗することを確認済み。
- BUG-6は調査の結果、既存のマイグレーション0035 + `onConflictDoNothing` で修正済みと判明。再発防止テストのみ追加。
- 検証: `pnpm run test-once` / `pnpm run tsc` / `pnpm run fix` 全パス。
  - 訂正（2026-07-18 multi-review): 上記「tsc全パス」の初回報告は誤りだった。検証コマンドを `pnpm run tsc | tail` とパイプしていたため終了コードがtailのもので上書きされ、本PR追加の2テストファイルの型エラー9件を見逃していた（epistemicsレビュアーが検出）。テストの型エラーを修正し、パイプなしのexit code確認で再検証済み。
