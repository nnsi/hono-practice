# 英語圏リリース前の法務対応TODO

## 概要

英語版ToS/Privacy Policyを作成し、「優秀な弁護士」ロールのレビューで明らかになった、**規約と実装の乖離**を解消するためのTODO。

規約では約束しているが、実装が追いついていない項目。公開前に対応する必要がある。

## 方針転換: Web課金は当面停止（2026-04-05）

初期リリースでは **Web経由の課金導線を無効化**し、アップグレードは iOS/Android アプリ内課金（Apple IAP / Google Play Billing）のみに統一する。

### 背景
- Polar も MoR（Merchant of Record）ではあるが、日本の特商法免除を明文化していない（Apple/Google と違い、日本法人での販売元記載がない）
- Webに課金導線を残す限り特商法表記が必要で、個人事業主として氏名・住所の常時公開が不可避
- IAP のみなら販売主体は Apple/Google K.K. となり、開発者側の特商法表記は不要という一般的解釈に乗れる

### 実装
- 環境変数 `VITE_ENABLE_WEB_SUBSCRIPTION=false`（デフォルト）で以下を非表示:
  - 設定画面の「アップグレード」ボタン
  - `EntitlementGate` の Pro アップグレード CTA
  - `UpgradeModal`
  - 設定画面の特商法ページへのリンク
- モバイルアプリ経由への誘導文言も**置かない**（外部誘導と解釈されるリスク回避）
- 既に Web で Polar 課金中のユーザーは `subscription.plan === "premium"` が読まれるので Pro 機能は引き続き使える
- バックエンドの `POST /users/subscription/checkout` は `POLAR_ACCESS_TOKEN`/`POLAR_PRICE_ID` 未設定で 503 を返すため二重防御
- 特商法ページのコード（`commercialTransactions.ts`, `/tokushoho` ルート）は残し、flag=true で即復活できる状態にする

### 関連: Web課金を将来復活させる場合
- `VITE_ENABLE_WEB_SUBSCRIPTION=true` で導線が出る
- その時点で「Premium解約ボタン」（下記§1）の実装が必須になる

---

## 最優先（公開前に必須）

### 1. Premium解約ボタンの実装（Web版）

> **現状のステータス**: Web課金無効化により一旦ブロッカーから外れる。再度 Web 課金を有効化する際は必須。

**現状:**
- `apps/frontend/src/components/setting/SubscriptionSection.tsx` にUpgradeボタンはあるが、Cancelボタンがない
- Web版Premiumユーザーは**アカウント削除しないと解約できない**状態

**規約での約束:**
- ToS Section 5: "You can cancel a web subscription at any time from the settings screen within the Service"

**リスク:**
- EU Directive 2011/83/EU（解約はサインアップと同じ容易さであるべき）違反
- FTC Click-to-Cancel Rule（米国、2024施行）違反
- Dark Patternとして消費者当局に通報されるリスク

**対応:**
- Polar APIの subscription cancel エンドポイントを呼ぶボタン実装
- 確認UI（インライン2段階確認）
- 解約後も現在の課金期間終了まで利用可能であることを表示

**工数:** 小（1-2時間）

---

## 中優先（公開後早めに）

### 2. 物理削除バッチの実装

**現状:**
- アカウント削除は**論理削除のみ**（サーバー側で soft delete）
- 物理的なデータ削除は未実装

**規約での約束:**
- PP Section 8: "Account data and activity data: Deleted within 30 days of account deletion, except as required by law"

**リスク:**
- GDPR Art. 17（忘れられる権利）の観点で、原則物理削除が必要
- 猶予期間は認められるが、最終的な物理削除は不可欠
- DPAから開示請求があった場合に実態と乖離

**対応:**
- 論理削除後、一定期間（推奨: 30-90日）経過したレコードを物理削除するバッチ
- 関連テーブル全てをカバー: user, activity, activity_log, activity_goal, activity_kind, task, api_key, user_subscription, subscription_history, user_provider, refresh_token
- Cloudflare Workers Cron Triggersで実装
- 削除ログを監査用に保存

**工数:** 中（0.5-1日）

---

### 3. 法務ページへのEffective Date表示

**現状:**
- ToS/PPに施行日（Effective Date）/ 最終更新日（Last Updated）の記載なし

**規約での約束/要件:**
- GDPR、CCPA/CPRA ともにポリシーの有効日明示を推奨

**対応:**
- LegalPage componentにeffectiveDate propを追加
- 各法務ページ（ja/en）にeffective dateを表示
- 更新履歴の管理方法も検討

**工数:** 小（0.5-1時間）

---

## 参考: 「優秀な弁護士」ロールレビューで指摘された他の項目

以下は既にToS/PPに文言として対応済みだが、運用フローの整備が必要な項目：

- **本人確認プロセス**: PP Section 9で「verify identity before fulfilling requests」と約束。問い合わせフォームからの削除・開示請求に対する本人確認手順を準備しておく
- **バックアップ案内**: PP Section 7で「CSV export featureでバックアップ推奨」と記載。既に実装済み（CSVExportModal.tsx）
- **事業譲渡時のデータ移転**: PP Section 5で開示済み。将来的なM&A/法人化時はPP改定+ユーザー通知のフローを用意

## 関連ファイル

- `packages/frontend-shared/legal/en/termsOfService.ts`
- `packages/frontend-shared/legal/en/privacyPolicy.ts`
- `packages/frontend-shared/legal/getLegalContent.ts`
- `apps/frontend/src/components/setting/SubscriptionSection.tsx`
- `apps/frontend/src/components/setting/AccountSection.tsx`

## セッション記録

- 2026-04-05: 英語版ToS/PP作成、法務レビュー3ラウンド実施、「優秀な弁護士」ロールで追加レビュー → 規約と実装の乖離を発見
