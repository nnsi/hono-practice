import { AppError } from "@backend/error";
import dayjs from "@backend/lib/dayjs";
import type { CreateAIActivityLogRequest } from "@dtos/request";
import { CreateAIActivityLogResponseSchema } from "@dtos/response";
import type { UserId } from "@packages/domain/user/userSchema";

import type { AIActivityLogUsecase } from "./aiActivityLogUsecase";

export function newAIActivityLogHandler(uc: AIActivityLogUsecase) {
  return {
    createActivityLogFromSpeech: createActivityLogFromSpeech(uc),
  };
}

function createActivityLogFromSpeech(uc: AIActivityLogUsecase) {
  return async (userId: UserId, params: CreateAIActivityLogRequest) => {
    const today = dayjs().format("YYYY-MM-DD");

    const result = await uc.createActivityLogFromSpeech(
      userId,
      params.speechText,
      today,
    );

    const parsed = CreateAIActivityLogResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("Invalid parse");
    }

    return parsed.data;
  };
}
