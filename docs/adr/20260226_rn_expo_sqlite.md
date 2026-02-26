# React Native版ローカルDBにexpo-sqliteを採用

## ステータス

決定

## コンテキスト

Actiko React Native版の移行にあたり、ローカルDBとして WatermelonDB と expo-sqlite を比較検討した。

WatermelonDBの強みは built-in Sync と大規模データの遅延読み込みだが、以下の背景がある:

- Actikoは既にバックエンドにv2 sync APIが存在し、ドメイン層にRepository抽象（sync系メソッド含む）が定義済み
- 個人向けアプリのため、レコード数は限定的（数万件でも差分syncで問題なし）
- Expo Goでの開発・OTA更新の自由度を重視したい
- WatermelonDBはJSI（ネイティブSQLiteモジュール）を要求し、Expo Goで動作しない

## 決定事項

**expo-sqlite を採用する。**

理由:

1. **既存sync基盤を流用できる**: バックエンドへの変更が不要。ドメイン層のRepository型にexpo-sqlite具象実装を書くだけ
2. **Expo Go対応**: ネイティブモジュール不要のため、開発中はExpo Goで即座に動作確認できる
3. **OTA更新に制約なし**: ネイティブコード変更を伴わないため、EAS Updateで自由に配信可能
4. **Dexie実装との1:1対応**: 既存Web版のRepository実装を機械的に移植できる。標準SQLで学習コストゼロ
5. **WatermelonDBの強みが活きない**: built-in Syncは既存sync基盤と競合し、大規模データ最適化は個人アプリに不要

リアクティビティ（Dexieの`useLiveQuery`相当）は、EventEmitter + カスタムhookで実現する（約50行）:
- Repository writeメソッド末尾で `dbEvents.emit(tableName)` を呼ぶ
- `useLiveQuery(tables, queryFn)` がテーブル変更を購読して自動再クエリ

## 結果

- **バックエンド**: 変更なし。既存v2 sync APIをそのまま利用
- **ドメイン層**: 変更なし。Repository型定義・sync系メソッドをそのまま利用
- **モバイルアプリ**: expo-sqlite Repository具象実装 + EventEmitterリアクティビティ層を新規実装
- **開発フロー**: Expo Goで開発可能（ただしvictory-native等のネイティブ依存UIライブラリ導入時はDev Buildに移行）
- **将来**: APIリクエスト数がボトルネックになった場合はバッチエンドポイント追加で対応。DB層の変更は不要

## 備考

WatermelonDBが適切になるシナリオ:
- グループ協調編集機能の追加（ただし本格的にはCRDT系が必要）
- sync基盤を持たない新規プロジェクト

現時点のActikoの方向性ではいずれも該当しないため、expo-sqliteが最適と判断した。
