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

### 2. 物理削除の実装（方針変更: Cronバッチ → 管理画面手動）

> **2026-04-05 方針変更**: 当初は Cloudflare Workers Cron Triggers による自動バッチを想定していたが、初期の運用規模を鑑みて **管理画面からの手動物理削除** に切り替え。
> 運用で「30日以内に処理する」ことを担保する前提。将来ユーザー規模が増えて手動処理が回らなくなった段階で Cron 自動化を再検討する。

**現状のステータス:** `wt/admin-user-delete` ブランチで実装済み（9adc17c, ce5289f）。master へマージ待ち。

**規約での約束:**
- PP Section 8: "Account data and activity data: Deleted within 30 days of account deletion, except as required by law"

**実装内容（wt/admin-user-delete ブランチ）:**
- `DELETE /admin/users/:id` エンドポイント（loginId 二重確認）
- 管理画面 `UserDangerZone` UI から実行
- 関連テーブルを FK 依存順に単一トランザクションで削除: user, activity, activity_kind, activity_log, activity_goal, goal_freeze_period, task, api_key, user_subscription, user_provider, refresh_token, contact 等
- `subscription_history` は `subscription_history_archive` へアーカイブしてから削除
- `admin_user_deletion_log` に監査ログ（管理者メール・削除件数）を保存
- ts-mockito 単体テスト + 統合テスト

**運用上の追加タスク（手動運用の担保）:**
- 削除依頼の受付経路を決める（問い合わせフォーム → 管理者が管理画面で処理）
- 「依頼受領から30日以内に処理」を運用ルールとして明文化
- 処理漏れ防止のため、依頼受付から日数経過しているものを可視化する仕組み（将来的に）

**リスク（手動運用の弱点）:**
- 管理者が30日以内に処理しなかった場合、PP Section 8 と実態が乖離する
- ユーザー規模拡大時にボトルネック化する可能性

**工数:** 実装済み。運用フロー整備のみ残り（0.5日程度）

---

### 3. 法務ページへのEffective Date表示 ✓ 対応済み（2026-04-05）

**対応内容:**
- ToS/PP（ja/en それぞれ）に `effectiveDate` 定数を追加（初版: 2026年5月1日 / May 1, 2026）
- `getLegalContent()` の返り値に `effectiveDate` を追加
- `LegalPage`（web 全画面）、`LegalModal`（web/mobile）でタイトル直下にグレーで表示
- tokushoho は対象外（日本法表記のため別運用）

**今後の運用:**
- ToS/PP を改定する際は対応する `effectiveDate` 定数を更新する
- 更新履歴の管理方法（changelog等）は将来的に必要になった時点で検討

---

### 4. 年齢ゲート + 同意タイムスタンプ記録 ✓ 対応済み（2026-04-05）

**背景:**
- 英語ToS Section 2 で "at least 16 years of age" を `represent and warrant` として約束しているが、signup フォームに年齢確認UIが存在せず、規約と実装の乖離があった

**対応内容:**
- 新規テーブル `user_confirm`（migration 0037）を追加: `type (terms|privacy|age)`, `version`, `confirmed_at`
- ToS/PP に `termsOfServiceVersion = "2026-05-01"` / `privacyPolicyVersion = "2026-05-01"` を導入（`effectiveDate` 表示文字列とは別）
- 同意取得UI（提案B）: email/pw は必須 checkbox、OAuth はボタン直下の sign-in-wrap テキスト
- signup時にトランザクションで user + 3件の同意レコード（age/terms/privacy）を atomic に作成
- Web/Mobile 両方の CreateUserForm に適用
- admin の物理削除フローにも `user_confirm` の hard delete を組み込み
- 統合テストで同意レコードが正しく記録されること + consents欠落時400を検証

**既存ユーザーの扱い:**
- 2026-05-01 以前に登録されたユーザーは同意レコードなし（grandfathering）
- 将来ToS/PP改定時に再同意モーダルを出す際は「レコードなし＝旧版同意扱い」として扱う

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
- 2026-04-05: 物理削除を Cron 自動バッチ → 管理画面手動 に方針変更（`wt/admin-user-delete` ブランチで実装）
- 2026-04-05: Effective Date 表示を実装（LegalPage / LegalModal × web/mobile）
- 2026-04-05: 年齢ゲート + 同意タイムスタンプ記録を実装（user_confirm テーブル、web/mobile両対応、統合テスト含む）
