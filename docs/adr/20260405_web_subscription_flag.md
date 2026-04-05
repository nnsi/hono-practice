# Web課金の一時停止とfeature flag導入（VITE_ENABLE_WEB_SUBSCRIPTION）

## ステータス: Accepted

## コンテキスト

初期リリースに向けた法務準備の過程で、**Polar経由のWeb課金を残すと日本の特定商取引法に基づく表記（特商法表記）が必須**になることが明確になった。

### 特商法表記の負担

- 個人事業主の氏名は常時公開必須（消費者庁Q&A、特商法11条1号）
- 住所・電話番号は「請求による開示」で省略可能だが、氏名は省略不可
- 販売事業者として個人の実名をパブリックに晒す必要がある

### Polarの位置づけ

- Polar は Merchant of Record (MoR) を謳うが、日本の特商法免除を明文化していない
- Apple App Store / Google Play は日本法人（iTunes K.K. / Google Asia Pacific）が販売元となり、開発者側の特商法表記は不要という解釈が一般的
- Polar には日本法人による販売元記載の明文はないため、安全側に倒すなら開発者側で特商法表記が必要と解釈される

### 代替案の検討

| 案 | 特商法表記 | 課金導線 |
|---|---|---|
| A. Polar Web課金を残す（現状） | 必要（個人氏名公開） | Web + iOS/Android IAP |
| B. Web課金を完全撤去 | 不要 | iOS/Android IAP のみ |
| C. feature flag で切り替え可能にする | flag=false時は不要 | 可変 |

## 決定事項

### 1. 初期リリースは Web課金を無効化（案C採用）

- 環境変数 `VITE_ENABLE_WEB_SUBSCRIPTION`（デフォルト `false`）を導入
- `false` 時は以下を非表示:
  - 設定画面の「アップグレード」ボタン
  - `EntitlementGate` の Pro アップグレード CTA
  - `UpgradeModal`
  - 設定画面の特商法ページへのリンク
- コード（`commercialTransactions.ts`, `/tokushoho` ルート, `UpgradeModal`, `useUpgrade`）は残し、flag=true で即復活できる状態にする

### 2. モバイルアプリへの誘導文言は置かない

Apple の外部決済誘導禁止規約に抵触するリスク、および特商法非表示化の趣旨（販売主体がApple/Googleであるという建付け）と矛盾するため、flag=false時に「モバイルアプリからアップグレードしてください」等の誘導を**一切置かない**。

`EntitlementGate` は `onUpgrade` を optional にし、undefined の場合は CTA ブロック全体（「アップグレードして全機能をお使いください」文言 + ボタン）を非表示にする。

### 3. 既存ユーザーのPro機能継続利用

Web で Polar 課金中のユーザー、および iOS/Android IAP で課金中のユーザーは、いずれも `subscription.plan === "premium"` として読まれるため、flag=false でも Pro 機能（API キー等）を引き続き利用できる。

### 4. バックエンドの二重防御

`POST /users/subscription/checkout` は `POLAR_ACCESS_TOKEN`/`POLAR_PRICE_ID` 未設定時に 503 を返す（`apps/backend/feature/subscription/checkoutRoute.ts:24-26`）。

- Frontend flag と Backend env の片方が誤設定されても、もう一方で止まる

### 5. ルートとコンテンツは残す

- `/tokushoho` ルート、`commercialTransactions.ts` のコンテンツは削除せず残す
- flag=false でもURLを直打ちすればページは表示される
- 将来 Web 課金を復活させる際、コードを書き直さずに環境変数だけで切り替え可能

## 却下した案

### 案A. Polar Web課金を残す
- 個人氏名の常時公開が必須になる
- 氏名を晒すリスクを初期リリース時に負うのは過大
- Polar の MoR が日本の特商法免除に対応しているという明確な根拠がない

### 案B. Web課金を完全撤去（コード削除）
- 将来 Web 課金を再開したい場合、コードを書き直す必要がある
- Web 課金の技術基盤（Polar checkout, webhook, entitlement）は維持価値がある

## 結果

### ユーザー影響

- Free ユーザー（Web）: アップグレード導線が消える。プラン表示は「Free」バッジのみ
- Premium ユーザー（Web、Polar由来）: Pro 機能を引き続き利用可能、解約導線なし
- Premium ユーザー（Mobile IAP由来、Webにもログイン）: Pro 機能を Web でも利用可能

### 法務影響

- 特商法表記が不要になる（Apple/Google IAP のみで課金する限り）
- プライバシーポリシー・利用規約は引き続き必須
- Premium解約ボタン実装は「Web課金を再開するまでブロッカー解除」

### 運用影響

- GitHub Variables に `VITE_ENABLE_WEB_SUBSCRIPTION_STG` / `_PROD` を設定する（未設定時は空文字→false扱い）
- ローカル開発で有効化する場合は `.env.local` に `VITE_ENABLE_WEB_SUBSCRIPTION=true` を追加

## 備考

### 将来 Web 課金を再開する条件

- Polar が日本の特商法免除を明文でサポートする、または
- 法人化して特商法表記の負担が軽減される、または
- 個人氏名公開を許容する判断がなされる

いずれかが満たされた時点で、`VITE_ENABLE_WEB_SUBSCRIPTION=true` に切り替え + Premium解約ボタン実装 + 特商法ページのリリース準備を再開する。

### 関連ドキュメント

- `docs/todo/legal-docs-release-prep.md`: Web課金停止により Premium解約ボタン実装はブロッカー解除、物理削除バッチ・Effective Date表示は引き続き必須
