# Android ホーム画面タイマーウィジェットの実装方式

## ステータス

決定（2026-03-24 更新: 実機検証フィードバック反映）

## コンテキスト

Actiko は「最速で活動量を記録する」アプリであり、タイマー計測をホーム画面から即座に開始したいニーズがある。アプリを開く → Activity を選ぶ → 開始、という 3 ステップを、ホーム画面のウィジェットタップ 1 回に短縮したい。

モバイルアプリは Expo SDK 54 + React Native 0.81 のマネージドワークフロー（EAS Build）で構築されている。Android ウィジェットはネイティブの AppWidgetProvider API で実装する必要があるため、Expo エコシステム内でどのようにネイティブコードを統合するかが主な論点となる。

### 検討した選択肢

| 案 | 概要 | メリット | デメリット |
|----|------|---------|-----------|
| **1. react-native-android-widget** | FlexWidget/TextWidget 等で宣言的に UI を定義する JS ベースライブラリ。Expo config plugin 対応 | JS のみで完結。宣言的 API で学習コスト低 | `Chronometer` コンポーネントを持たない。JS バックグラウンドタスクは最短 15 分間隔のため毎秒更新不可 |
| **2. Expo Modules API + ネイティブ Kotlin**（採用） | AppWidgetProvider + Android 標準 API で完全なウィジェットを実装。Expo Module として統合 | Android ネイティブ API をフル活用可能。Chronometer ビューで OS レベルの毎秒更新。expo-sqlite と同じ DB に直接アクセス可能 | ネイティブ Kotlin コードの保守が必要。iOS は別途 SwiftUI で実装が必要 |
| **3. @bittingz/expo-widgets** | iOS/Android 両対応のコミュニティ Expo プラグイン | 両プラットフォーム対応を謳っている | メンテナンス頻度が低い。SDK 54 との互換性が未検証 |

案 1 は、タイマーウィジェットの核心要件である「毎秒のカウントアップ表示」が技術的に実現不可能なため却下。案 3 は、メンテナンス状況と SDK 互換性のリスクから却下。

## 決定事項

**案 2: ローカル Expo Module + ネイティブ Kotlin** を採用する。

### 主要な設計判断

1. **アプリのタイマーとは完全独立**: ウィジェットは SharedPreferences で自身のタイマー状態（開始時刻・対象 Activity ID 等）を管理する。AsyncStorage やアプリ側の状態との同期は行わない。アプリ内タイマーとウィジェットタイマーの二重管理による複雑性を排除する

2. **DB 直接アクセス**: expo-sqlite が使用する `actiko.db`（`context.filesDir/SQLite/actiko.db`）を Kotlin の SQLiteDatabase API で直接 open する。WAL モードにより、アプリとウィジェットの同時アクセスは安全に行える

3. **sync_status='pending' で INSERT**: ウィジェットから記録した activity_log は `sync_status='pending'` で DB に INSERT する。アプリの sync engine が次回同期時に自動でサーバーへ送信するため、ウィジェット側にネットワーク処理は不要

4. **Activity 情報は毎回 DB から取得**: SharedPreferences に Activity の名前や emoji をキャッシュしない。ウィジェット表示のたびに DB から読み取ることで、アプリ側で Activity の名前・emoji を変更した場合や Activity を削除した場合にウィジェットへ即反映される

5. **auth_state による user_id フィルタリング**: ウィジェットの SQL クエリに `auth_state` テーブルのサブクエリを含め、現在ログイン中のユーザーの Activity のみを表示・操作対象とする。アカウント切替時はウィジェットが自動的に無効化される

6. **recordingMode による拡張性**: SharedPreferences に `recordingMode` を保存する構造とし、将来 counter（回数記録）や check（実施チェック）等のモードも同じウィジェット構造で対応可能にする

### タイマー表示の実装方式（実機検証で変更）

| 方式 | 結果 |
|------|------|
| AlarmManager.set() | 5秒間隔に間引かれた（Android バッテリー最適化） |
| AlarmManager.setExact() + SCHEDULE_EXACT_ALARM | 権限が自動付与されず、ユーザーが設定画面で手動許可が必要 |
| **Chronometer ビュー（採用）** | OS レベルで毎秒描画更新。権限不要、バッテリー効率良好 |

当初は AlarmManager + TextView で毎秒更新する設計だったが、実機検証で Android 12+ のバッテリー最適化により `set()` が 5 秒間隔に間引かれることが判明。`setExact()` は `SCHEDULE_EXACT_ALARM` 権限が必要だがマニフェスト宣言だけでは自動付与されず、ユーザーに設定画面での手動許可を求める UX が必要になる。

最終的に RemoteViews の `Chronometer` ビューを採用。Chronometer は Android OS が描画を管理するため、権限不要で確実に毎秒更新される。タイマー停止時は `setTextViewText()` で静的な経過時間を表示する。

### foreground sync の追加

ウィジェットが `actiko.db` に直接 INSERT した record はアプリの `dbEvents` を経由しないため、アプリの useLiveQuery や sync engine が即座に検知できない。対策として `useSyncEngine` に AppState の foreground リスナーを追加し、アプリがバックグラウンドから復帰するたびに `syncEngine.syncAll()` を即座に実行するようにした。

## 結果

- **EAS Build 必須**: ネイティブ Kotlin コードを含むため、Expo Go での動作は不可。開発・テストには EAS Build（development build）が必要
- **iOS は別途対応が必要**: 今回は Android のみの実装。iOS ウィジェットを実装する場合は SwiftUI + WidgetKit で別途開発が必要
- **DB スキーマとの結合**: ウィジェット側の SQL クエリは DB スキーマに直接依存する。`activities` テーブルや `activity_logs` テーブルのスキーマ変更時にはウィジェット側の Kotlin コードも更新が必要

## 備考

- Chronometer ビューは `SystemClock.elapsedRealtime()` ベースで動作する。デバイス再起動時には SharedPreferences の壁時計ベースの `startTimeMillis` から経過時間を再計算して base を設定するため、正確な表示が維持される
- WAL モードでの同時アクセスは「1 writer + N readers」モデル。アプリとウィジェットが同時に書き込むケースは、activity_log の INSERT タイミングが異なるため実運用上は発生しにくい
- ウィジェットから記録された pending レコードが sync で stuck する可能性について調査済み。foreground sync で頻度を上げた上で再現を監視中
