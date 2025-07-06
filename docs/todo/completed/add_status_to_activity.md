# activityテーブルにshowCombinedStatsカラムを追加した際の対応チェックリスト

## 1. 型定義の修正（/packages/types）

- [ ] CreateActivityRequest.ts に `showCombinedStats` を追加
- [ ] UpdateActivityRequest.ts の `activity` オブジェクトに `showCombinedStats` を追加
- [ ] GetActivitiesResponse.ts に `showCombinedStats` を追加

## 2. ドメイン層の修正（/apps/backend/domain/activity/activity.ts）

- [ ] ActivitySchema（BaseActivitySchema）に `showCombinedStats` を追加

## 3. ユースケース層の修正（/apps/backend/feature/activity/activityUsecase.ts）

- [ ] createActivity で `showCombinedStats` を受け取り保存
- [ ] updateActivity で `showCombinedStats` を受け取り更新

## 4. リポジトリ層の修正（/apps/backend/feature/activity/activityRepository.ts）

- [ ] createActivity, updateActivity で `showCombinedStats` をDB保存・更新時に反映

## 5. APIハンドラ・ルートの修正（/apps/backend/feature/activity/）

- [ ] activityHandler, activityRoute で `showCombinedStats` を受け渡し

## 6. フロントエンド（必要に応じて）

- [ ] Activity作成・編集画面で `showCombinedStats` の入力UIを追加
- [ ] Activity取得時に `showCombinedStats` を利用

---

## 備考

- マイグレーションファイルで `show_combined_stats` カラムが追加されていることを確認すること。
- テストケースも必要に応じて修正・追加すること。
