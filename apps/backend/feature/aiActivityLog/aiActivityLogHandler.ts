import { AppError } from "@backend/error";
import type { UserId } from "@packages/domain/user/userSchema";
import type { CreateAIActivityLogRequest } from "@packages/types/request";
import { CreateAIActivityLogResponseSchema } from "@packages/types/response";

import type { AIActivityLogUsecase } from "./aiActivityLogUsecase";

export type AIActivityLogHandler = ReturnType<typeof newAIActivityLogHandler>;

export function newAIActivityLogHandler(uc: AIActivityLogUsecase) {
  return {
    createActivityLogFromSpeech: createActivityLogFromSpeech(uc),
  };
}

function createActivityLogFromSpeech(uc: AIActivityLogUsecase) {
  return async (userId: UserId, params: CreateAIActivityLogRequest) => {
    const result = await uc.createActivityLogFromSpeech(
      userId,
      params.speechText,
      params.clientDate,
    );

    const parsed = CreateAIActivityLogResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("Invalid parse");
    }

    return parsed.data;
  };
}
