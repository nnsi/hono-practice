# Web / React Native 共通コード化計画

## 目的
- Web 版 (`apps/frontend`) と React Native 版 (`apps/mobile`) に重複して存在するドメインロジック・ API アクセス・型定義・ユーティリティを mono-repo の `packages` 配下に集約し、メンテナンスコストと実装コストを削減する。
- UI 層はプラットフォーム差分が大きいため **頭の無い (headless) コンポーネント** と **ビジネスロジック (hooks) **を共有し、表示部分は各プラットフォームでラップする戦略を採用する。

---

## 現状分析 (2025-07-01 時点)
### 既存の共有物
| 現状位置 | 内容 |
| --- | --- |
| `packages/types` | API リクエスト/レスポンス DTO (Zod schema 付き) |
| `packages/auth-core` | 認証トークン管理・ API ラッパ |

### 重複ファイル例
| Web | Mobile | 特記事項 |
| --- | --- | --- |
| `ActivityEditDialog.tsx` | 同名 | フォームバリデーション・ API 連携はほぼ共通、UI が異なる |
| `ActivityLogCreateDialog.tsx` | 同名 | 同上 |
| `NewActivityDialog.tsx` | 同上 | 〃 |
| `hooks/useAuth.ts` | 同上 | ロジックは同じだが React-Native 側は SecureStore 使用 |
| `utils/apiClient.ts` | 同上 | 実質同一実装 |

> ✨ **推測**: 画面数 15 程度・ hooks 30+ は共通化余地が高い。

### 即座に共通化できるユーティリティ／定数 (from *cc* ドキュメント)
| 種別 | 現状ファイル | 内容 |
| --- | --- | --- |
| 時間ユーティリティ | `apps/frontend/src/utils/timeUtils.ts` ほか | `isTimeUnit`, `getTimeUnitType`, `convertSecondsToUnit`, `generateTimeMemo` など純粋関数群 |
| 定数 | 同上 | `TIME_UNITS`, `WEEKDAYS_JP` など |

### 軽微な抽象化で共通化可能なロジック
| 分類 | Web 位置 | Mobile 位置 | 共通化方法 |
| --- | --- | --- | --- |
| 日付ナビゲーション | `components/activity/ActivityDateHeader.tsx` | 同名 | `@shared-utils/dateNavigation.ts` に `navigateToToday/Previous/Next` を定義 |
| React Query ヘルパ | `utils/queryParams.ts` | Mobile は直接 useQuery | `@shared-utils/query-helpers.ts` としてラップ |

### ビジネスロジックの重複例
| 機能 | 詳細 | 共通化方針 |
| --- | --- | --- |
| タスク管理 | 完了切替 / 作成 / 削除 | `@shared-hooks/useTaskManagement` を作成し API 呼び出しを内包 |
| トークン管理 | Mobile: `AppState` 監視, Web: `window` event | StorageAdapter + Lifecycle hook を依存性注入で吸収 |

### プラットフォーム固有実装 (把握)
| 分類 | Web のみ | Mobile のみ |
| --- | --- | --- |
| UI Lib | Radix UI / Tailwind | React Native Components |
| ルーティング | TanStack Router | Expo Router |
| Storage | `localStorage` | `AsyncStorage` / `SecureStore` |
| イベント | DOM Event | `AppState`, `eventBus` |
| ネットワーク | fetch, CORS | Expo ネットワーク設定, iOS/Android 特有

---

## 共通化ポリシー
1. **レイヤリング**
   - `packages/domain` : エンティティ/バリューオブジェクト/サービス (DB, UI 非依存)
   - `packages/data`   : API クライアント・ Repository 抽象化
   - `packages/hooks`  : ビジネスロジックを扱う React hooks (UI 非依存)
   - `packages/ui-core` : Headless UI (Form, Dialog state machine, etc) ※ 見た目の無い状態
2. プラットフォーム専用実装は **Adapter パターン** で `apps/*` 側に配置 (例: `Dialog.web.tsx` / `Dialog.native.tsx`).
3. Zod schema / DTO は `packages/types` に残し、他パッケージへ再エクスポート。
4. API エンドポイント生成は openapi-typescript (既存コードに合わせる) をビルド時に共通生成。

---

## 新規パッケージ構成案
| パッケージ | 依存 | 目的 | 備考 |
| --- | --- | --- | --- |
| `@shared/domain` | なし | クリーンアーキテクチャのドメイン層 | 各 Entity, VO, サービス, Factory
| `@shared/data` | `@shared/domain`, `@shared/types` | 外部 I/O (REST, Storage) 抽象化 | fetch 実装は `cross-fetch` を利用
| `@shared/hooks` | React 18, `@shared/data` | 非 UI ロジック (form 制御, mutation wrapper 等) | React Native & Web で同一
| `@shared/ui-core` | React 18 | Headless UI コンポーネント群 | Radix UI の Primitive を参考
| `@shared/auth` | `@shared/data`, SecureStore(optional) | 認証/認可ロジック | 既存 `auth-core` 統合

---

## マイグレーション手順 (フェーズ分割)
### Phase 0: 足場作り
1. Yarn/NPM workspace に新パッケージディレクトリを作成。
2. `tsconfig.base.json` で `paths` を定義 (`@shared/*`).
3. CI で `pnpm -r build` の依存順を解決。

### Phase 1: 型 / API クライアントの共通化
1. `packages/types` 内 DTO を確認し、名前を `@shared/types` に変更。
2. `apiClient` を `packages/data/src/apiClient.ts` に移動し、axios/fetch のみ差し替え可能に。
3. 既存両アプリから relative import を `@shared/data` へ変更。

### Phase 2: hooks 共通化
1. `useAuth`, `useGlobalDate`, `useActivities` などの hooks を `@shared/hooks` に移動。
2. SecureStore 等ネイティブ固有 API は **インタフェース**化しプラットフォーム側で実装。
   ```ts
   // @shared/hooks/storage.ts
   export interface TokenStorage { get(): Promise<string|null>; set(t:string):Promise<void>; }
   ```
3. ビルド時に `mobile`/`frontend` それぞれで `TokenStorage` の実体を `alias` する。

### Phase 3: ビジネスフォームコンポーネント共通化
1. Form ロジック部を抽出 ⇒ `@shared/ui-core/ActivityFormController.tsx`
2. `Dialog` 見た目は `apps/frontend/.../ActivityEditDialog.web.tsx` と `apps/mobile/.../ActivityEditDialog.native.tsx` に実装。
3. Storybook (react-native-web で共通) で動作確認。

### Phase 4: ドメイン層共通化
1. `apps/backend/domain` 相当を `@shared/domain` と同期 (npm link) し、フロントでも再利用。
2. バリューオブジェクトのバリデーションを一元化。

### Phase 5+: 更なる共通化アイデアと評価

**検討アイデア**
1. **完全共通 UI コンポーネント化**
   - Tamagui / Expo Router を全面採用し、`apps/frontend` を React Native Web ビルドへ統合。
   - `tailwindcss` を廃止し、`tamagui` のテーマ／トークンに一本化。
2. **共通 Navigation レイヤ**
   - React Navigation + Expo Router を Web & Mobile 双方で使用。
3. **Mono‐backend/front ドメイン共有**
   - `@shared/domain` を `apps/backend` でも直接 import し、コード生成を廃止。

### 追加リターン
| 項目 | 効果 | 定量/定性 |
| --- | --- | --- |
| UI 実装の完全共通化 | JSX コードの80%削減を見込む | 定量
| デザイントークンの一元管理 | ブランド変更工数を半減 | 定量
| ナビゲーションの学習コスト削減 | 新規メンバーのオンボーディング容易化 | 定性 |
| ドメイン層の一本化 | テスト・型整合性の向上 | 定性 |

### 主要リスク
| リスク | 内容 | 影響度 | 回避策 |
| --- | --- | --- | --- |
| **パフォーマンス劣化** | React Native Web は SSR 時の初期ロードサイズが大きい | ★★★ | SplitChunk & CDN キャッシュ、Next.js への移行検討 |
| **ネイティブ UI ジェスチャ差分** | ScrollView/Snap 等の挙動差 | ★★☆ | Platform.OS 分岐で調整、E2E テスト強化 |
| **Tamagui / Expo Router の将来性** | OSS メンテ状況に依存 | ★★★ | 採用前に企業サポート契約を検討 |
| **既存 Tailwind クラスの移行コスト** | CSS in JS 化による rewrite | ★★☆ | codemod スクリプト + 段階的置換 |
| **フロントとバックエンドの高結合化** | バージョン同期失敗時に両方壊れる | ★★☆ | semver 厳格運用 + CI Contract Test |

### 判断
リスクリターン比を検討した結果、**現時点ではリスクがリターンを上回る** と判断。
特に **パフォーマンス劣化** と **OSS 依存リスク** がプロダクト KPI (初回 LCP 3s 以内) を脅かす可能性が高い。

> ✅ よって Phase 5 以降の更なる共通化は一旦保留し、上記リスクが解消またはリターンが高まる状況 (ユーザ数拡大によるメンテコスト肥大 など) を待って再検討する。

---

## タスク分解 (ジュニア対応版)

> 各タスクは「作業内容 → 完了条件」の順で記載し、所要時間目安（◎30 min／●1h／★2h 以上）を付与しています。

### Phase 0 : 足場作り
- [ ] **0-1. パッケージディレクトリ作成 ◎**
  完了条件: `tree -L 2 packages` に `shared-types`, `shared-data`, `shared-hooks`, `shared-ui-core` が表示される
- [ ] **0-2. workspaces 設定 ◎**
  完了条件: ルート `package.json` にパスを追加後、`pnpm install` がエラーなく終了
- [ ] **0-3. tsconfig paths 追加 ◎**
  完了条件: `pnpm tsc -b` がエラー 0 で完了
- [ ] **0-4. 共通ビルドスクリプト追加 ●**
  完了条件: `pnpm run build` で各新規パッケージの `dist/` が生成される
- [ ] **0-5. cc 版ドキュメント削除 ◎**
  完了条件: `git status` に `docs/todo/app-web-common-code-cc.md` が D 表示

### Phase 1 : 型 / API クライアント共通化
- [ ] **1-1. packages/types → shared-types へ改名 ★**
  完了条件: `pnpm run build -F @shared/types` が成功
- [ ] **1-2. import 更新 (約 40 箇所) ★**
  完了条件: `pnpm tsc -b` で型エラー 0
- [ ] **1-3. shared-data パッケージ作成 ●**
  完了条件: backend テストが全て Green
- [ ] **1-4. フロント 2 アプリの apiClient 参照更新 ★**
  完了条件:
    – Web: `pnpm dev --filter=apps/frontend` でログイン〜トップ表示が正常
    – Mobile: `expo start --web` で同操作が正常

### Phase 2 : hooks 共通化
- [ ] **2-1. shared-hooks skeleton ◎**
  完了条件: 空ビルド成功
- [ ] **2-2. TokenStorage インタフェース作成 ◎**
  完了条件: 型エラー 0
- [ ] **2-3. LocalStorageAdapter 実装 (Web) ◎**
  完了条件: DevTools で token が localStorage に保存されている
- [ ] **2-4. SecureStoreAdapter 実装 (Mobile) ●**
  完了条件: Expo Go 上で token が SecureStore に保持されている
- [ ] **2-5. useAuth 等 hooks 移設 ★**
  完了条件: Web/Mobile 両方で「ログイン→Today ページ→活動一覧取得」が成功し、単体テスト Green

### Phase 3 : Headless Form コンポーネント
- [ ] **3-1. shared-ui-core 初期化 ◎**
  完了条件: 空ビルド成功
- [ ] **3-2. ActivityFormController 抽出 ★**
  完了条件: Storybook 上でバリデーションが機能し submit で console に値が出る
- [ ] **3-3. Storybook セットアップ（Web） ●**
  完了条件: `pnpm storybook` を開き、コンポーネントが操作可能
- [ ] **3-4. ActivityEditDialog.web.tsx ラッパ更新 ●**
  完了条件: フロントアプリで編集ダイアログから保存が成功
- [ ] **3-5. ActivityEditDialog.native.tsx ラッパ更新 ★**
  完了条件: Expo アプリで同操作が成功し UI ずれが無い

### Phase 4 : ドメイン層共通化（Optional）
- [ ] **4-1. shared-domain パッケージ作成 ★**
  完了条件: `pnpm build -F @shared/domain` が成功
- [ ] **4-2. フロント側 VO 参照置換 ★**
  完了条件: フロントアプリの型エラーが 0

### 横断タスク
- [ ] **A. ESLint boundaries ルール追加 ●**
  完了条件: `pnpm lint` で circular import が検出 or 無いことを確認
- [ ] **B. ドキュメント更新 ◎**
  完了条件: 該当 PR に README / ADR 差分が含まれる
- [ ] **C. CI ジョブ調整 ●**
  完了条件: GitHub Actions で全ジョブ Green

---

## リスクと対策
| リスク | 影響 | 対策 |
| --- | --- | --- |
| React Native Web の polyfill 不足 | Web 動作崩れ | `nativewind` & `tamagui` の採用検討 |
| パッケージ間 circular import | ビルド失敗 | `eslint-plugin-boundaries` で監視 |
| TypeScript 解決順序 | tsc エラー | Project Reference を使用 |
| 機能追加と並行開発衝突 | デプロイ遅延 | feature flag で段階リリース |

---

### 完了の定義 (Definition of Done)
1. `pnpm test -r` と `pnpm build` がローカル・CI で成功する。
2. Web: `pnpm dev --filter=apps/frontend` で「ログイン → 活動編集 → 保存」が出来る。
3. Mobile: `expo start --web` で同操作が出来る。
4. Storybook で `ActivityFormController` が動作し、Controls で値変更時にバリデーションが反映される。
5. `apps/frontend`・`apps/mobile` の `components/activity` から重複ロジックが 70% 以上削除され、UI ラッパのみになっていることをコードレビューで確認できる。

---

_This plan was generated by o3 ultrathink on 2025-07-01_
