# nativewind (react-native-css-interop) のカラースキーム同期パッチ

## ステータス

決定

## コンテキスト

アプリ設定でライトモード、iOS設定でダークモードの状態で OTA Update (`Updates.reloadAsync()`) を実行すると、再起動後にダークモードで描画される問題が発生した。

### 根本原因

nativewind (v4.2.2) が依存する `react-native-css-interop` (v0.2.2) の `colorScheme.set()` は、本番環境では `Appearance.setColorScheme()` を呼ぶだけで、内部の `colorSchemeObservable` を更新しない。observable の更新は `Appearance.addChangeListener` 経由で行われる前提だが、`Updates.reloadAsync()` 後はこのリスナーが発火しないケースがある。

```
// appearance-observables.ts (パッチ前)
set(value) {
    appearance.setColorScheme(value);
    // テスト環境でのみ observable を更新
    if (process.env.NODE_ENV === "test") {
        colorSchemeObservable.set(value === "system" ? "light" : value);
    }
},
```

nativewind の設計意図は「本番では `Appearance.addChangeListener` が必ず発火する」前提だが、以下の条件でこの前提が崩れる:
- `Updates.reloadAsync()` 後の JS 再起動時（`Appearance.setColorScheme()` の結果はリセットされる）
- `AppState.currentState !== "active"` の間にリスナーが発火した場合（nativewind 側で無視される）

### 試行した対策と結果

| 対策 | 結果 |
|------|------|
| ThemeProvider で `ready` ゲート（null 返却） | nativewind の observable が更新されないため、ready 後も dark のまま |
| `expectedScheme` でマッチング待ち + タイムアウト | リスナー未発火のためタイムアウト後に dark で描画 |
| `Appearance.setColorScheme("unspecified")` でリセット→再適用 | グローバルな Appearance 変更が全画面遷移でフラッシュを引き起こす |
| AppState "active" 復帰時に再適用 | 初回起動時は AppState が既に active で遷移イベントが発生しない |
| Appearance 永続化に依存（reloadAsync はネイティブ側を保持する前提） | 実際にはリセットされることが判明 |

## 決定事項

`react-native-css-interop` に pnpm patch を適用し、`colorScheme.set()` が本番環境でも `colorSchemeObservable` を即座に更新するよう変更する。

```
// appearance-observables.ts (パッチ後)
set(value) {
    appearance.setColorScheme(value);
    // 本番でも observable を同期更新
    colorSchemeObservable.set(value === "system" ? undefined : value);
},
```

- `"system"` の場合は `undefined` をセットし、`colorScheme.get()` が `systemColorScheme` にフォールバックするようにする（デバイステーマ追従を維持）
- `"light"` / `"dark"` の場合は値を直接セットし、`systemColorScheme` より優先される

## 結果

- OTA restart 後のダークモードフラッシュが解消
- `useTheme` フックの `applyColorScheme` 呼び出しが即座にnativewindの全 `dark:` クラスに反映される
- `ready` ゲート、白背景ブロック、タイムアウト等のワークアラウンドが不要になり、useTheme がシンプルに
- Appearance リスナーが正常に発火する場合は `systemColorScheme` も更新されるため、二重更新になるだけで副作用なし

## 備考

- パッチ対象: `react-native-css-interop@0.2.2`（`dist/` の JS と `src/` の TS 両方）
- nativewind / react-native-css-interop のバージョンアップ時にパッチの再適用または不要化の確認が必要
- 将来的にアップストリームで修正される可能性がある（テスト環境限定にしている理由は「本番ではリスナーが発火する前提」のみ）
