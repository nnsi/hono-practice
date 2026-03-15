# オフラインファースト即UI表示（auth 1時間制限撤廃）

## ステータス

決定

## コンテキスト

`useAuth` の `tryOfflineAuth()` に1時間キャッシュ制限（`hoursAgo < 1`）があり、最終ログインから1時間以上経過するとローディング画面でブロックされていた。本番の `/auth/token` は平均763ms（72%がコールドスタート）で、全API完了まで画面が表示されないため体感ロード時間が2-3秒に達していた。

1時間制限は「安全策が整うまでの暫定ゲート」として導入されたものだが、以下のエッジケースが未対策だったため撤廃できていなかった。

### 対策が必要だったエッジケース

| ID | 問題 | 深刻度 |
|----|------|--------|
| H1 | サーバーデータが pending ローカル変更を上書きする | HIGH |
| H2 | userId 確認前に push sync が走り別アカウントにデータ漏洩 | HIGH |
| H3 | userId 空文字でローカルDB に書き込み | HIGH |
| H4 | clearLocalData 後にインフライト sync が書き戻す | HIGH |
| H5 | push 失敗を成功扱いしてローカルデータを synced にマーク | HIGH |
| H6 | serverRefreshAndSync 失敗時に syncReady が永久 false | HIGH |
| H7 | ログアウト後に React Query キャッシュに前ユーザーデータが残る | HIGH |
| M1 | initialSync の中途半端な書き込みで useLiveQuery が中間状態を描画 | MEDIUM |
| M4 | チャンク処理で全チャンク完了まで mark されない | MEDIUM |
| M5 | initialSync と syncAll の並行実行でデータ競合 | MEDIUM |
| M6 | 設定画面で Google アカウント情報取得前に「未連携」と誤表示 | MEDIUM |

## 決定事項

### エッジケース対策（全て先行実装）

- **H1**: `upsertFromServer` で `_syncStatus: "pending"` のレコードをフィルタ（frontend-v2）/ `WHERE sync_status <> 'pending'` 条件追加（mobile-v2）
- **H2**: `useAuth` に `syncReady` state 追加。`syncWithUserCheck` 完了後に初めて true にし、`useSyncEngine` に渡す
- **H3**: `createActivity`/`createGoal`/`createTask` で userId 未設定時に throw
- **H4**: `syncState.ts` にモジュールレベルの世代カウンター。`clearLocalData()` で世代を進め、全 sync 関数で DB 書き込み前に世代チェック
- **H5**: 全 sync 関数の `if (!res.ok) return;` → `throw new Error(...)` に変更
- **H6**: `serverRefreshAndSync` を `Promise<boolean>` に変更。失敗時は online イベントでリトライ、`authGenRef` で logout 後のインフライトキャンセル
- **H7**: `logout()` で `queryClient.clear()` を呼び出し
- **M1**: `performInitialSync` の DB 書き込みを `db.transaction()` でラップ
- **M4**: 全チャンク完了後の一括 mark → チャンクごとの即座 mark に変更
- **M5**: `upsertFromServer` に `updatedAt` 比較を追加。サーバーデータが古ければスキップ
- **M6**: `useGoogleAccount` に `isLoading` state 追加。fetch 完了前はスケルトン表示

### 本体改修

上記対策の完了後、`tryOfflineAuth()` の `hoursAgo < 1` 条件を削除。Dexie の `authState.lastLoginAt` が存在すれば無条件で即 UI 表示し、auth/sync はバックグラウンドで実行する。

frontend-v2 と mobile-v2 の両方に適用。変更はそれぞれ `useAuth.ts` の数行の削除のみ。

## 結果

- ログイン済みユーザーはローディング画面を経由せず即座に UI が表示される
- auth/sync はバックグラウンドで実行され、完了後に useLiveQuery が自動的に再描画
- エッジケース対策により、即 UI 表示中のデータ整合性・セキュリティが担保される
- E2E テスト（auth 含む18テスト）全パスで回帰なし

## 備考

- M2（stale キャッシュ表示のフリッカー）と L1（sync 中インジケータ）は本番で体感してから判断する方針で後回しにした
- M3（複数タブ重複 push）はバックエンドが冪等なため実害は API コスト増のみ。API 側キャッシュで吸収する案もあるが未着手
