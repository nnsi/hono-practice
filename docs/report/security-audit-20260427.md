# セキュリティ監査レポート（CI + apps/*）
> 実施日: 2026-04-27

## 対象範囲
- CI ワークフロー: `.github/workflows/*.yml`
- アプリケーションディレクトリ:
  - `apps/backend`
  - `apps/frontend`
  - `apps/admin-frontend`
  - `apps/mobile`
  - `apps/tail-worker`

## 実施方式（サブエージェント相当）
ディレクトリ単位で並列レーンを切り、最後に統合して評価した。
- Agent-CI: GitHub Actions ワークフローのセキュリティ
- Agent-Backend: API / 認証 / ストレージ / サーバー側制御
- Agent-Frontend: ブラウザアプリのトークン/XSS面
- Agent-AdminFrontend: 管理画面の認証とトークン保管
- Agent-Mobile: モバイルのトークン/キー保管とネイティブ連携面
- Agent-TailWorker: Worker エントリポイントと依存面

## 実行コマンド
- 各 `apps/*` ディレクトリで `pnpm audit --prod --json`
- 高リスクシンク（eval / exec / 危険な HTML 挿入 など）のパターンスキャン
- 認証/トークン/ストレージ利用のパターンスキャン
- `.github/workflows` と `apps/*` の重要ファイルの目視レビュー

## 結果サマリ
- Critical: **0件**
- High: **1件**
- Medium: **3件**
- Low: **3件**
- Informational（制約含む）: **2件**

---

## Agent-CI（`.github/workflows`）

### [HIGH] `infra.yml` の一部サードパーティ Action がコミットSHA固定されていない
- `hashicorp/setup-terraform@v3` と `actions/github-script@v7` はタグ固定であり、コミットSHA固定ではない。
- 上流タグ改ざんやサプライチェーン事故時のリスクが相対的に高い。
- 該当箇所:
  - `.github/workflows/infra.yml:69`
  - `.github/workflows/infra.yml:127`
  - `.github/workflows/infra.yml:198`

**推奨対応**
- 他 Action と同様に、すべてコミットSHAで固定する。

### [MEDIUM] `mobile-release` ジョブに明示的な `permissions` 設定がない
- `publish` ジョブには `permissions` があるが、`mobile-release` にはない。
- リポジトリ/組織のデフォルト設定に依存し、必要以上の権限になる可能性がある。
- 該当箇所:
  - `.github/workflows/deploy.yml` の `mobile-release` ジョブ

**推奨対応**
- `mobile-release` に最小権限の `permissions` を明示する（例: `contents: read` を起点に必要分のみ追加）。

### [MEDIUM] Worker 実行時シークレットへの機密情報投入が広い
- デプロイフローで `CF_WORKERS_TOKEN` と `CF_ACCOUNT_ID` を stg/prod の Worker 実行時シークレットへ投入している。
- Worker 側が侵害された場合の影響範囲（blast radius）が大きくなる。
- 該当箇所:
  - `.github/workflows/deploy.yml:224-225`
  - `.github/workflows/deploy.yml:269-270`

**推奨対応**
- 実行時に本当に必要かを再確認する。
- 必要な場合も、最小権限トークン化と用途分離を徹底する。

### [LOW] 手動モバイルリリースの悪用抑止が弱い
- `workflow_dispatch` で build/OTA の実行経路がある。
- `mobile-release` 側に明示的な environment 保護設定がこのファイル内にない。
- 該当箇所:
  - `.github/workflows/deploy.yml` の `mobile-release` ジョブ

**推奨対応**
- production 向け操作には reviewer gate を含む environment 保護を設定する。

---

## Agent-Backend（`apps/backend`）

### [MEDIUM] 公開 R2 プロキシエンドポイントに認可ガードがない
- `GET /r2/:key` は任意キーのオブジェクト取得をプロキシしているが、認可チェックがない。
- 同一バケットに非公開オブジェクトが混在し、キーが推測・漏えいした場合はアクセス制御リスクになる。
- 該当箇所:
  - `apps/backend/feature/r2proxy/r2ProxyRoute.ts:7-29`

**推奨対応**
- 非公開データが混在する構成なら、署名URL検証またはキー空間ごとの認可を導入する。

### [LOW] オブジェクトキー生成に非暗号学的乱数を使用
- アイコンキーのサフィックス生成に `Math.random()` を使用している。
- 機密用途の乱数ではないが、予測困難性は暗号学的乱数より弱い。
- 該当箇所:
  - `apps/backend/utils/imageValidator.ts:93`

**推奨対応**
- `crypto.getRandomValues` ベースへ寄せ、乱数品質を統一する。

### [LOW] 既存の良好な防御実装（確認事項）
- CORS は許可リスト方式で、dev/test のローカルオリジン制御あり。
  - `apps/backend/app.ts:53-77`
- バッチ API はパストラバーサル相当パターンを拒否し、`/users/` プレフィックス制約を実施。
  - `apps/backend/app.ts:123-137`
- `secureHeaders` をグローバル適用。
  - `apps/backend/app.ts:45-51`
- API キー生成は Web Crypto 乱数 + SHA-256 ハッシュ化。
  - `packages/domain/apiKey/apiKeySchema.ts:65-104`

---

## Agent-Frontend（`apps/frontend`）

### [INFO] 危険シンクの明確な該当は確認されず
- スキャン上、`eval` / `new Function` / `child_process` / `dangerouslySetInnerHTML` の直接利用は未検出。

### [LOW] `localStorage` 利用は存在（設定/状態用途）
- 設定・タイマー・同期状態を `localStorage` に保存している。
- スキャン対象内では bearer トークンの直接保存は確認されなかった。
- 代表箇所:
  - `apps/frontend/src/components/setting/useAppSettings.ts`
  - `apps/frontend/src/hooks/useTimer.ts`
  - `apps/frontend/src/sync/webPlatformAdapters.ts`

**推奨対応**
- 機密トークンを `localStorage` に置かない方針を維持する。

---

## Agent-AdminFrontend（`apps/admin-frontend`）

### [MEDIUM] 管理者 JWT を `localStorage` に保管
- `admin_token` を `localStorage` に保存/読込している。
- XSS 発生時にトークン窃取リスクが高い。
- 該当箇所:
  - `apps/admin-frontend/src/hooks/useAdminAuth.ts:43-46`
  - `apps/admin-frontend/src/hooks/useAdminAuth.ts:77-82`
  - `apps/admin-frontend/src/hooks/useAdminAuth.ts:102-107`

**推奨対応**
- 可能なら httpOnly + secure cookie セッションへ移行する。
- 段階移行中は CSP 強化、厳格なサニタイズ、短命トークン化を併用する。

---

## Agent-Mobile（`apps/mobile`）

### [LOW] ストレージ設計は概ね妥当、継続監視が必要
- リフレッシュトークン/音声APIキーは `expo-secure-store` / Keychain 経路を使用。
  - `apps/mobile/src/utils/apiClient.ts:51-68`
  - `apps/mobile/src/lib/voiceApiKey.ts:18-44`
- `AsyncStorage` は主に設定・キャッシュ系用途に見える。
  - `apps/mobile/src/components/setting/useAppSettings.ts`
  - `apps/mobile/src/hooks/useTheme.ts`

**推奨対応**
- 機密は SecureStore/Keychain のみに限定する運用を継続する。
- 新規 `AsyncStorage` キー追加時に機密混入がないかレビュー手順へ固定する。

---

## Agent-TailWorker（`apps/tail-worker`）

### [INFO] 迅速スキャンで高リスクパターンは未検出
- リポジトリ全体スキャンの該当結果として、このディレクトリで顕著な危険シンクは見当たらなかった。

---

## ツール制約

### [INFO] 依存ライブラリの脆弱性DB照合が未完了
- 各 `apps/*` で `pnpm audit` 実行時に以下エラーが発生:
  - `ERR_PNPM_AUDIT_BAD_RESPONSE`
  - `https://registry.npmjs.org/-/npm/v1/security/audits responded with 403 Forbidden`

**影響**
- 依存ライブラリの CVE レベル照合は一部ブロックされた。

**推奨対応**
- CI 側で audit endpoint に到達できるレジストリ/トークン設定を整備する。
- 代替 SCA（`osv-scanner` / `trivy fs`）を併設し、監査経路を冗長化する。

---

## 優先対応プラン
1. `infra.yml` の未固定 Action をコミットSHA固定へ統一する。
2. Worker 実行時への `CF_WORKERS_TOKEN` 露出を縮小または廃止する。
3. 管理画面認証を `localStorage` 保管から httpOnly cookie セッションへ移行する。
4. `mobile-release` に最小権限 `permissions` と environment 保護を明示する。
5. `/r2/:key` が非公開データに触れうる構成なら認可/署名検証を導入する。
6. 依存CVE監査の自動経路を復旧し、代替スキャナを追加する。
