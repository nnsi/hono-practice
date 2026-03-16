# Actiko FB タスクリスト（最短経路）

目的: **まず Free-only で公開 → Billing 基盤を作る → Pro コンテンツを追加。**

---

## Phase 1: Free-only で公開できる状態にする ✅

- [x] Web: API Key Manager セクションを Settings から除外
- [x] Mobile: 同上
- [x] subscription API 未使用でも UI がクラッシュしないことを確認（ApiKeyManager 除外により subscription API 自体が呼ばれなくなった）

## Phase 2: Entitlement 関数 + Billing 基盤

UI には影響しない裏側の作業。公開済みアプリの挙動は変わらない。

### Entitlement
- [ ] `packages/domain/subscription/` に entitlement 関数を追加
  - [ ] `visibleHeatmapDays(plan)` — Free: 直近30日
  - [ ] `availableStatsGranularities(plan)` — Free: 日次/月次のみ
- [ ] Free / Pro の境界値を定数として定義

### plan 配信の設計変更
- [ ] Backend: `/user/me` のレスポンスに `plan` フィールドを追加（`GetUserResponse` を拡張）
- [ ] Frontend / Mobile: `/user/me` 取得時に plan をローカル（Dexie / SQLite）にキャッシュ
- [ ] 各コンポーネントが個別に useSubscription を呼ぶ構成をやめ、キャッシュ済み plan を参照する形に変更
- [ ] `/users/subscription` は管理用に残すが、フロントエンドの日常利用からは外す

### Billing 共通
- [ ] Backend: subscription 更新の共通ロジック（Stripe / RevenueCat どちらから来ても `user_subscription` を更新）
- [ ] Frontend / Mobile: plan 変更は次回 sync 時に `/user/me` 経由で反映

### Web（Stripe）
- [ ] Stripe 商品作成（Pro Monthly ¥680 / Pro Annual ¥5,800）
- [ ] Backend: Checkout Session API
- [ ] Backend: Stripe Webhook → subscription 更新

### Mobile（RevenueCat）
- [ ] RevenueCat プロジェクト設定 + App Store / Play Store 商品登録
- [ ] Mobile: RevenueCat SDK 組み込み + 課金シート表示
- [ ] Backend: RevenueCat Webhook → subscription 更新

### 検証（Billing 単体）
- [ ] Web で課金 → Backend の subscription が Pro になることを確認
- [ ] Mobile で課金 → 同上
- [ ] 解約 → Free に戻ることを確認

## Phase 3: 制限 UI + upgrade 導線（Web / Mobile 並行）

Billing が動いている状態で制限を追加するので、1つ入れるたびに即 e2e テストできる。

### Web
- [ ] Heatmap: Free は直近30日のみ（古い期間は disabled + upgrade 導線）
- [ ] Stats: 週次/四半期/年次を disabled + upgrade 導線
- [ ] API Key: ロック表示を復活 + upgrade 導線
- [ ] upgrade 先のページ/モーダル（→ Stripe Checkout）

### Mobile
- [ ] Heatmap: 同上
- [ ] Stats: 同上
- [ ] API Key: ロック表示を復活
- [ ] upgrade 導線（→ App Store / Play Store の課金シート）

### クロスプラットフォーム検証
- [ ] Web で課金 → Mobile で Pro 機能が解放されることを確認
- [ ] Mobile で課金 → Web で Pro 機能が解放されることを確認
- [ ] データ保持、機能のみ制限に戻る

---

## 有料要素（Pro）

| 機能 | Free | Pro |
|------|------|-----|
| Heatmap 履歴 | 直近30日 | 全期間 |
| 統計の粒度 | 日次 / 月次 | 週次 / 四半期 / 年次 |
| API Key | 不可 | 利用可 |
| Goal | 無制限 | 無制限 |
| CSV export | 利用可 | 利用可 |
| 記録（全モード） | 無制限 | 無制限 |

## 並行時の注意点

| 論点 | 方針 |
|------|------|
| subscription 権威 | Backend（`user_subscription` テーブル）。クライアントはキャッシュのみ |
| 両方で払った場合 | 先に有効な方を優先。二重課金防止はストア側 + Backend で制御 |
| オフライン時の entitlement | 最後にキャッシュした plan で判定。次回 sync 時に更新 |
| ストア手数料（30%） | Web（Stripe 3.6%）を推奨導線にする。Mobile はユーザー利便性として提供 |

## やらないこと（意図的に除外）

| 除外項目 | 理由 |
|----------|------|
| Goal 数制限 | Free で作ったデータの扱いが面倒。記録体験を削る方向になる |
| CSV export の制限 | データは全部クライアントにある。技術的に防げない制限は逆効果 |
| Trial 設計 | Billing が通ってから |
| Monthly / Annual 切り替え UI | まず Pro が1つ買える状態を作る |
| AI 系全般 | 第2段階 |
| Activity Kinds ゲート | 影響範囲が広すぎる |
| UI 重複の共通化 | 課金を通す目的に対して寄り道 |
| monetization-strategy.md の改訂 | fb.md が実質的な上書き |
| Heatmap の Backend チェック | オフラインファースト。クライアント側で制御 |
| ブラー/プレビュー演出 | disabled + 導線で十分 |
