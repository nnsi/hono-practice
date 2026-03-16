import type { ActivityContext } from "./aiActivityLogGateway";

export function buildParseActivityLogPrompt(
  speechText: string,
  activities: ActivityContext[],
  today: string,
): string {
  const activityList = activities
    .map((a) => {
      const kinds =
        a.kinds.length > 0
          ? ` (種類: ${a.kinds.map((k) => `${k.name}[${k.id}]`).join(", ")})`
          : "";
      const unit = a.quantityUnit ? ` [単位: ${a.quantityUnit}]` : "";
      return `- ${a.name} (id: ${a.id})${unit}${kinds}`;
    })
    .join("\n");

  return `あなたはユーザーの活動記録を支援するアシスタントです。
音声入力テキストを解析し、適切なActivityLogデータを生成してください。

## 今日の日付
${today}

## ユーザーの登録済みActivity一覧
${activityList}

## ルール
- activityId: 上記一覧から最も適切なものを選択。一覧にないActivityは選べない
- activityKindId: Activityに種類がある場合のみ選択。なければnull
- quantity: テキストから数値を抽出。「30分」→30、「1時間半」→90、「5km」→5。不明なら1
- date: テキストに日付指定があればYYYY-MM-DD形式で。「昨日」→前日、「一昨日」→2日前、指定なし→${today}
- memo: 元の入力テキストをそのまま入れる
- detectedActivityName: 選択したActivityの名前
- detectedKindName: 選択したActivityKindの名前。なければnull

## 入力テキスト
${speechText}`;
}
