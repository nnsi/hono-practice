# 記録モードシステム（ヘッドレスフック + 薄いレンダラー）

## ステータス

決定

## コンテキスト

Actiko のコンセプト「最速で活動量を記録する」を実現するには、アクティビティの性質に応じた専用入力 UI が必要。全アクティビティで同じ汎用フォーム（数量 + メモ + 保存ボタン）を使うのは入力の摩擦が大きい。

product-vision.md で定義した記録モード:
- **manual**: 従来の数量入力フォーム
- **counter**: ワンタッチで即記録（+1, +5, +10 等のステップボタン）
- **binary**: ActivityKinds をボタンとして並べ、タップで即記録（勝ち/負け等）
- **numpad**: テンキー UI で OS キーボードを回避した数値入力
- **timer**: タイマー計測 + 手動入力タブ
- **check**: 1タップで完了記録（やった/やらない）

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
