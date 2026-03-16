import type {
  AIActivityLogGateway,
  ActivityContext,
  ParseActivityLogResult,
} from "./aiActivityLogGateway";

/**
 * モックGateway: AIを呼ばず、Activity名の部分一致で最初にマッチしたものを返す。
 * 開発・テスト用。
 */
export function newAIActivityLogGatewayMock(): AIActivityLogGateway {
  return {
    parseActivityLog: parseActivityLogMock,
  };
}

async function parseActivityLogMock(
  speechText: string,
  activities: ActivityContext[],
  today: string,
): Promise<ParseActivityLogResult> {
  // 単純な部分一致でActivityを探す
  const matched = activities.find((a) => speechText.includes(a.name));

  if (!matched) {
    // マッチしない場合は最初のActivityにフォールバック
    const fallback = activities[0];
    if (!fallback) {
      throw new Error("No activities available");
    }
    return {
      parsed: {
        activityId: fallback.id,
        activityKindId: fallback.kinds[0]?.id ?? null,
        quantity: 1,
        date: today,
        memo: speechText,
      },
      interpretation: {
        detectedActivityName: fallback.name,
        detectedKindName: fallback.kinds[0]?.name ?? null,
        rawText: speechText,
      },
    };
  }

  // 数値を抽出（最初に見つかった数値を使用）
  const numberMatch = speechText.match(/(\d+)/);
  const quantity = numberMatch ? Number(numberMatch[1]) : 1;

  return {
    parsed: {
      activityId: matched.id,
      activityKindId: matched.kinds[0]?.id ?? null,
      quantity,
      date: today,
      memo: speechText,
    },
    interpretation: {
      detectedActivityName: matched.name,
      detectedKindName: matched.kinds[0]?.name ?? null,
      rawText: speechText,
    },
  };
}
