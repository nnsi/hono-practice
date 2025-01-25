# メモ

## やりたいこと

### 非機能

- スマホアプリ(React Native + Expo)

### 機能

- Activityの設定項目変更
- unitを時間/回数の2択に固定
- 定量目標設定

## 雑多

- 先にレコードを作る形式の方がよい？
  - +ボタンを押したらレコードが作られ、モーダルで編集みたいな
  - https://zenn.dev/stin/articles/remove-new-form-design
  - ドメインモデルをどうするかは要検討
    - emptyな状態のモデルを作る？
    - DBのnot null制約を削らないといけないかも？
      - テーブル分割チャンス？
