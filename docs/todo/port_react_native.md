# React Native (Expo Router) への移植チェックリスト

## 1. プロジェクトセットアップと基本設定

- [ ] Expo プロジェクトの初期化 (`apps/mobile` 内)
- [ ] 必要な依存関係のインストール (React Navigation, Expo Router, 状態管理ライブラリなど)
- [ ] `tsconfig.json` の設定 (React Native 用)
- [ ] ESLint, Prettier, Biome などの開発ツールの設定
- [ ] 環境変数管理方法の確立 (例: `.env` ファイル、`expo-constants`)
  - [ ] `VITE_API_URL` に相当する環境変数の設定
  - [ ] `VITE_GOOGLE_OAUTH_CLIENT_ID` に相当する環境変数の設定

## 2. UIコンポーネントの移植

- [ ] 共通UIコンポーネントの特定とReact Nativeコンポーネントへの置き換え戦略策定
  - [ ] `apps/frontend/src/components/ui` 以下のコンポーネントの分析
- [ ] 各画面・機能ごとのUIコンポーネントの再実装
  - [ ] スタイルシートの再作成 (例: StyleSheet API, Styled Components for React Native)
- [ ] アイコンや画像などのアセットの移行と最適化
  - [ ] `apps/frontend/public` や関連アセットの確認
- [ ] レスポンシブデザインへの対応 (異なるスクリーンサイズ)

## 3. ルーティングの再構築 (Expo Router)

- [ ] `apps/frontend/src/routes` のルーティング構造を分析
- [ ] Expo Router のファイルシステムベースのルーティング規約に従って画面を再配置
- [ ] ナビゲーションコンポーネント (ヘッダー、タブバーなど) の実装
- [ ] パラメータ付きルート、ネストされたルートの対応

## 4. ビジネスロジックと状態管理の移植

- [ ] 状態管理ライブラリ (例: Zustand, Redux, Recoil) の選定と導入
- [ ] `apps/frontend/src/hooks` やロジック部分の移植または再実装
- [ ] APIクライアントのセットアップ (例: `axios`, `fetch`)
  - [ ] APIリクエスト/レスポンスの型定義の共有または移植 (`packages/types` の活用)
- [ ] エラーハンドリングの共通化

## 5. 認証機能の移植

- [ ] Google OAuth の React Native (Expo) での実装
  - [ ] `expo-auth-session` または関連ライブラリの利用検討
  - [ ] クライアントIDなど設定値の適切な管理
- [ ] 認証状態の管理 (トークンの保存、セッション管理など)
  - [ ] `AsyncStorage` などの利用
- [ ] 認証が必要なルートの保護

## 6. プラットフォーム固有機能への対応

- [ ] ブラウザAPI (localStorage, DOM操作など) の代替機能への置き換え
  - [ ] `localStorage` -> `AsyncStorage`
  - [ ] その他、ウェブ特有のAPIの洗い出しと対応
- [ ] プッシュ通知、位置情報など、モバイル特有の機能要件があれば検討と実装

## 7. テスト

- [ ] 単体テストの整備 (Jest, React Native Testing Library)
- [ ] E2Eテストの検討 (Detox, Maestro など)

## 8. ビルドとデプロイ

- [ ] Expo (EAS Build) を使ったビルドプロセスの構築
- [ ] ストア申請のための準備 (アプリアイコン、スプラッシュスクリーン、各種設定)
- [ ] CI/CD パイプラインの更新 (GitHub Actions で `apps/mobile` のビルドとデプロイフローを追加)

## 9. その他

- [ ] `apps/frontend` と `apps/mobile` で共通化できるロジックや型定義 (`packages` ディレクトリなど) の検討
- [ ] ドキュメントの更新 (開発環境構築手順、アーキテクチャなど)

---

このチェックリストは初期のものです。プロジェクトの進行に合わせて適宜更新してください。
