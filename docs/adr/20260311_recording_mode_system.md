# 記録モードシステム（ヘッドレスフック + 薄いレンダラー）

## ステータス

決定

## コンテキスト

Actiko のコンセプトは「どんな活動も、その活動に最適な方法で、最速で記録できるアプリ」（`docs/plan/product-vision.md`）。習慣トラッカーではなく活動記録アプリであり、音ゲーのボタン入力回数、筋トレのセット数、ゲームの勝敗、開発時間など幅広い活動を対象とする。

マネタイズ戦略の議論（3/11）で、ユーザーの実ユースケース（音ゲーで数万単位の数値入力、筋トレ回数、ゲーム勝敗）を聞いた結果、「アプリを開く速度ではなく、データ入力の摩擦がボトルネック」という本質が見えた。既存の競合（Habitify, Streaks, Loop Habit Tracker 等）も入力タイプを分けているが、UIは全アクティビティで同じ汎用フォーム。アクティビティの性質ごとに最適化された専用入力UIを提供するアプリは存在しない。

これを受けて product-vision.md で記録モードシステムを定義:
- **manual**: 従来の数量入力フォーム
- **counter**: ワンタッチで即記録（+1, +5, +10 等のステップボタン）。音ゲーの入力回数や筋トレ回数
- **binary**: ActivityKinds をボタンとして並べ、タップで即記録。ゲームの勝敗など二択の記録。当日集計も表示
- **numpad**: アプリ内テンキーで OS キーボードを回避。セッション終了後のスコア入力
- **timer**: 開始→バックグラウンド計測→停止→記録。開発時間、読書時間
- **check**: 1タップで完了記録。瞑想、薬を飲んだなど。従来の習慣トラッカーが対象とする領域だが、Actiko ではモードの一つでしかない
- **音声**（未実装）: 音声入力 → AI がアクティビティと数値を自動判定

product-vision.md のアーキテクチャ図では記録モードシステムを「Actiko の核」と位置づけており、その上にゴール & Debt、可視化、AI が乗る構造。

Web (frontend-v2) と Mobile (mobile-v2) の両プラットフォームで同一のロジックを動かす必要がある。

## 決定事項

### 設計の変遷

3回の改訂を経て最終形に到達した:

1. **v1: レジストリパターン** — `Map` + `registerRecordingMode()` で実行時登録。全て `apps/frontend-v2/` に配置。**却下理由**: mobile-v2 を考慮していなかった。
2. **v2: 静的 Record + 3層分離** — `Record<RecordingMode, Component>` で型レベルのモード網羅を強制。domain / frontend-shared / apps の3層に分離。**却下理由**: ロジック（状態管理、バリデーション、ハンドラ）がプラットフォーム側に残る。
3. **v3: ヘッドレスフック + 薄いレンダラー** — 採用。

### 最終設計（v3）

```
packages/domain/activity/
  └─ recordingMode.ts          # RecordingMode 型定義

packages/frontend-shared/recording-modes/
  ├─ types.ts                  # 共通型（ViewModel, ModeProps）
  ├─ resolveRecordingMode.ts   # activity → RecordingMode 解決
  └─ modes/
      ├─ createUseManualMode.ts   # ファクトリ DI パターン
      ├─ createUseTimerMode.ts
      ├─ createUseCounterMode.ts
      ├─ createUseBinaryMode.ts
      ├─ createUseNumpadMode.ts
      └─ createUseCheckMode.ts

apps/frontend-v2/src/components/recording-modes/
  ├─ registry.ts               # Record<RecordingMode, React.FC>
  ├─ parts/                    # 共通UIパーツ（KindSelector, MemoInput, SaveButton）
  └─ modes/                    # 各モードのレンダラー（ViewModel を描画するだけ）

apps/mobile-v2/src/components/recording-modes/
  └─ （同構造の React Native 版）
```

### 設計原則

- **ヘッドレスフック**: 各モードのロジック（状態管理、バリデーション、submit）を `createUseXxxMode(deps)` として共有。ファクトリ DI で `useState` 等を注入（Metro + pnpm 環境の CJS 初期化問題を回避、`createUseSyncEngine` と同じ理由）。
- **薄いレンダラー**: プラットフォーム側は ViewModel を受け取って描画するだけ。ロジックは一切持たない。
- **レジストリ**: `Record<RecordingMode, React.FC>` で全モードを静的に登録。TypeScript がモード追加漏れをコンパイル時に検出。

### テスト

- ヘッドレスフックのテストは `@testing-library/react` の `renderHook` + 本物の `useState` + `act()` で実行。mock useState は使わない（DI は本番コードのためであり、テストでは本物の React を使う）。

## 結果

- 新モード追加のコストが低い: factory + test + web renderer + mobile renderer の4点セットを機械的に追加するだけ
- ロジック変更が1箇所で済む: タブ切替追加時にヘッドレスフック1ファイル + レンダラー2ファイルで完結
- LogFormBody が 275行/316行 → 51行/58行 にリファクタリングされた

## 備考

- binary モードは当初 config の `labels: [string, string]` から逆算して固定2ボタンの設計にしてしまった。正しくは ActivityKinds をそのままボタンとして並べる設計。config のデータ構造に引っ張られず、ドメインの意味を先に理解すべきだった。
- counter モードのワンタッチ記録（`recordStep(step)` が即座に `onSave` を呼ぶ）は、旧来の「溜めて保存」パターンより操作感が良い。
