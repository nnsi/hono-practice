# ウィジェット直接書き込みの RN 側反映はフォアグラウンド復帰時 sync で許容する

## ステータス

決定

## コンテキスト

iOS / Android ウィジェットは expo-sqlite の DB に生 SQL で直接 INSERT する（`WidgetDbHelper.swift` / `WidgetDbHelper.kt`）。RN 本体の `useLiveQuery` は `dbEvents`（JS 内イベントエミッタ）駆動のため、**別プロセスであるウィジェットからの書き込みを検知できない**。ユーザーがウィジェットで記録した直後にアプリを開くと、sync が走るまで旧状態が表示される。

Web（Dexie/IndexedDB）には同種の問題はない。2026-06-10 のアーキテクチャレビューで Mobile 固有の非対称として指摘された。

### 現状の緩和策

- `AppState` が `active` になったタイミングで sync が走り、ウィジェット書き込み分が反映される
- 体感上の遅延は「アプリ起動直後の一瞬」に限られる

### 代替案: ネイティブ変更通知

iOS は Darwin notification（`CFNotificationCenterGetDarwinNotifyCenter`）、Android は Broadcast / ContentObserver でウィジェット→RN に書き込みを通知し、受信側で `dbEvents` を発火する。即時反映になるが:

- Swift / Kotlin 両方の変更 + expo-modules ブリッジ追加が必要
- 検証に EAS ビルド（1回20-30分）+ 実機/シミュレータでのウィジェット操作確認が必要
- 失敗コストが高い割に、改善されるのは「起動直後の一瞬の表示遅延」のみ

## 決定事項

**現挙動（フォアグラウンド復帰時 sync での反映）を仕様として許容する。** ネイティブ変更通知は実装しない。

### TODO（将来再評価の条件）

以下のいずれかが発生したら、ネイティブ変更通知（Darwin notification / Broadcast → `dbEvents` 発火）の実装を再評価する:

- [ ] ウィジェット書き込み直後の表示遅延に関するユーザー報告・レビュー指摘が発生した
- [ ] ウィジェットの書き込み頻度が上がる機能（タイマー連動の自動記録等）を追加する
- [ ] Live Activity 等、アプリがフォアグラウンドのままウィジェット側が書き込むシナリオが生まれた（この場合 AppState 復帰イベントが発火せず、現緩和策が効かない）

## 影響

- コード変更なし
- 関連: `apps/mobile/src/db/dbEvents.ts`、`apps/mobile/targets/widget/`、`apps/mobile/modules/timer-widget/`、`scripts/check-widget-schema.js`（スキーマ整合ガード）
