import type { AIClient } from "@backend/infra/ai";
import { Output, generateText } from "ai";
import { z } from "zod";

import type {
  AIActivityLogGateway,
  ActivityContext,
  ParseActivityLogResult,
} from "./aiActivityLogGateway";
import { buildParseActivityLogPrompt } from "./aiActivityLogPrompt";

const ParsedActivityLogSchema = z.object({
  activityId: z.string(),
  activityKindId: z.string().nullable(),
  quantity: z.number(),
  date: z.string(),
  memo: z.string(),
  detectedActivityName: z.string(),
  detectedKindName: z.string().nullable(),
});

export function newAIActivityLogGateway(
  client: AIClient,
  model: string,
): AIActivityLogGateway {
  return {
    parseActivityLog: parseActivityLog(client, model),
  };
}

function parseActivityLog(client: AIClient, model: string) {
  return async (
    speechText: string,
    activities: ActivityContext[],
    today: string,
  ): Promise<ParseActivityLogResult> => {
    const prompt = buildParseActivityLogPrompt(speechText, activities, today);

    const { output } = await generateText({
      model: client(model),
      output: Output.object({ schema: ParsedActivityLogSchema }),
      prompt,
    });

    if (!output) {
      throw new Error("AI did not return structured output");
    }

    return {
      parsed: {
        activityId: output.activityId,
        activityKindId: output.activityKindId,
        quantity: output.quantity,
        date: output.date,
        memo: output.memo,
      },
      interpretation: {
        detectedActivityName: output.detectedActivityName,
        detectedKindName: output.detectedKindName,
        rawText: speechText,
      },
    };
  };
}
