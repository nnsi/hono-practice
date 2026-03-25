# iOS ホーム画面タイマーウィジェットの実装方式

## ステータス

決定

## コンテキスト

Android 版タイマーウィジェット（ADR 20260323）が実装済み。同等機能の iOS 版を WidgetKit + SwiftUI で実装する。Android 版の設計判断（独立タイマー状態・DB 直接アクセス・sync_status='pending' での INSERT・auth_state フィルタリング）を iOS にも適用する。

iOS 固有の課題として、WidgetKit extension はメインアプリとは**別プロセス**で動作するため、Android のように同一プロセス内で DB ファイルを共有することができない。App Group 共有コンテナを介したファイル共有が必須となる。

### 検討した選択肢（DB 共有方式）

| 案 | 概要 | メリット | デメリット |
|----|------|---------|-----------|
| **1. App Group 共有コンテナに DB 移動**（採用） | expo-sqlite の `directory` 引数で DB を App Group コンテナ内に配置。ウィジェットが直接アクセス | Android と同じ「DB 直接アクセス」アーキテクチャ。sync ロジック不要 | 既存ユーザー向けに DB パスのマイグレーションが必要。`database.ts` にプラットフォーム分岐 |
| **2. UserDefaults をブリッジとして使用** | Activity リストを UserDefaults に同期。ウィジェットは UserDefaults 経由で読み書き | expo-sqlite への変更不要。DB マイグレーション不要 | 二重同期の複雑性。Activity 変更時のデータ鮮度問題 |
| **3. 共有コンテナに別 DB を作成** | メイン DB はそのまま。ウィジェット用の軽量 DB を共有コンテナに別途作成 | メイン DB への影響なし | 2 つの DB 間の同期ロジックが必要。Android にない複雑性 |

案 2・3 は Android 版にない同期ロジックを導入するため、保守コストが増大する。案 1 は expo-sqlite v16 の `openDatabaseAsync(name, options, directory)` 第 3 引数でカスタムディレクトリを指定可能であることを型定義で確認済み。DB マイグレーションは一回限りの処理で実装コストは低い。

### 検討した選択肢（Config Plugin）

| 案 | 概要 | メリット | デメリット |
|----|------|---------|-----------|
| **1. `@bacons/apple-targets`**（採用） | Expo エンジニア Evan Bacon が開発。宣言的に WidgetKit target を追加 | Xcode プロジェクト操作を抽象化。`expo-target.config.js` で宣言的設定。entitlement 継承対応 | 外部依存の追加 |
| **2. カスタム `withXcodeProject` Plugin** | `@expo/config-plugins` の API で Xcode プロジェクトを直接操作 | 外部依存なし | pbxproj 操作が極めて複雑。WidgetKit target 追加は数百行のコード |

案 2 は Xcode プロジェクトファイル（pbxproj）の操作が極めてエラーしやすく、EAS Build の Xcode バージョン更新のたびに壊れるリスクがある。案 1 は Expo エコシステムの事実上の標準であり、benchmark score 84・code snippets 157 で十分な実績がある。

## 決定事項

### 主要な設計判断

1. **DB 共有: App Group 共有コンテナ方式**: expo-sqlite の `directory` 引数で iOS のみ App Group コンテナ（`group.<bundleId>`）を使用。Android は従来通り変更なし

2. **DB パスマイグレーション**: 既存ユーザー向けに、旧パス（`Documents/SQLite/actiko.db`）から App Group コンテナへ 1 回限りのコピー。コピー成功後も旧ファイルはバックアップとして残す。コピー失敗時は旧パスで継続（フォールバック）

3. **タイマー表示: `Text(date, style: .timer)`**: WidgetKit の標準機能で OS がカウントアップ描画を管理。Android の `Chronometer` ビューに相当。権限不要、バッテリー効率良好

4. **Interactive Widgets (iOS 17+)**: `Button(intent:)` + `AppIntent` でウィジェット内の Start/Stop/Reset をアプリ起動なしで実行。iOS 17 のシェアは 2026 年時点で 90% 超

5. **Kind 選択: ディープリンク方式**: WidgetKit extension は任意の UI（モーダル等）を表示できないため、Kind がある Activity のタイマー停止時は `actiko://widget/kind-select?activityId=X` でアプリを起動。Android の `KindSelectActivity`（ダイアログ）とは UX が異なる

6. **タイマー状態: UserDefaults (App Group suite)**: Android の SharedPreferences に相当。`UserDefaults(suiteName: "group.<bundleId>")` で App/Widget 間で共有。Activity ID をキーとして使用（Android の widget ID とは異なる）

7. **Android 版の設計判断をそのまま適用**:
   - アプリのタイマーとは完全独立
   - Activity 情報は毎回 DB から取得（キャッシュしない）
   - auth_state による user_id フィルタリング
   - sync_status='pending' で INSERT
   - Widget extension では DB migration を実行しない（アプリ側のみ）

### ファイル構成

```
apps/mobile/
  targets/widget/                    # @bacons/apple-targets の規約
    expo-target.config.js            # target 設定
    index.swift                      # @main WidgetBundle
    TimerWidget.swift                # Widget + Provider + SwiftUI View
    TimerAppIntents.swift            # Start/Stop/Reset Intent
    ActivitySelectionIntent.swift    # Configuration Intent
    WidgetDbHelper.swift             # SQLite アクセス (Kotlin 版移植)
    TimerState.swift                 # UserDefaults ラッパー
    TimeConversion.swift             # 時間単位変換
    UuidV7.swift                     # UUID v7 生成
  modules/timer-widget/
    ios/TimerWidgetModule.swift      # App Group パス公開用 Expo Module
    app.plugin.js                    # 更新: iOS entitlement 追加
    expo-module.config.json          # 更新: platforms に "ios" 追加
  src/db/
    database.ts                      # 更新: iOS 時 App Group ディレクトリ使用
    appGroupDirectory.ts             # NEW: App Group パス取得
```

## 結果

- **EAS Build 必須**: WidgetKit extension のネイティブ Swift コードを含むため、Expo Go での動作は不可
- **iOS 17+ 必須**: Interactive Widgets の要件。iOS 16 以下は非対応
- **foreground sync**: Android 版で追加済みの AppState foreground リスナー（`syncAll()`）がそのまま iOS でも機能する
- **DB スキーマとの結合**: Android 版と同様、Swift 側の SQL クエリが DB スキーマに直接依存する

## 備考

- `Text(date, style: .timer)` は `Date` オブジェクトからの経過時間を OS が自動描画する。デバイス再起動やタイムゾーン変更にも正しく対応する
- WAL モードでの同時アクセスは Android 版と同じ「1 writer + N readers」モデル
- WidgetKit の timeline 更新は `WidgetCenter.shared.reloadTimelines(ofKind:)` で明示的にトリガーする。AppIntent の実行後に呼び出す
- `@bacons/apple-targets` の `ExtensionStorage` で `reloadWidget()` メソッドも提供されており、アプリ側（React Native）からウィジェットのリロードをトリガーできる
