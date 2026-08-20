import { noopLogger } from "@backend/lib/logger";
import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import { newAIActivityLogUsageHandler } from "../aiActivityLogUsageHandler";

const USER_ID = createUserId("00000000-0000-4000-8000-000000000000");
const PARAMS = {
  speechText: "30分ランニングした",
  clientDate: "2026-07-13",
};
const RESULT = {
  activityLog: {
    id: "00000000-0000-4000-8000-000000000001",
    date: "2026-07-13",
    quantity: 30,
    memo: "30分ランニングした",
    activity: {
      id: "00000000-0000-4000-8000-000000000002",
      name: "ランニング",
    },
    activityKind: null,
  },
  interpretation: {
    detectedActivityName: "ランニング",
    detectedKindName: null,
    rawText: "30分ランニングした",
  },
};

function options() {
  const info = vi.fn();
  const error = vi.fn();
  return {
    logger: { ...noopLogger, info, error },
    options: {
      consumeQuota: vi.fn().mockResolvedValue(undefined),
      logger: { ...noopLogger, info, error },
      userId: USER_ID,
      apiKeyId: null,
      model: "test-model",
      now: vi.fn().mockReturnValueOnce(100).mockReturnValue(145),
    },
  };
}

describe("AI activity log usage handler", () => {
  it("consumes quota once and preserves a handler failure", async () => {
    const handlerError = new Error("gateway failed");
    const setup = options();
    const handler = {
      createActivityLogFromSpeech: vi.fn().mockRejectedValue(handlerError),
    };
    const decorated = newAIActivityLogUsageHandler(handler, setup.options);

    await expect(
      decorated.createActivityLogFromSpeech(USER_ID, PARAMS),
    ).rejects.toBe(handlerError);

    expect(setup.options.consumeQuota).toHaveBeenCalledOnce();
    expect(setup.logger.error).toHaveBeenCalledWith(
      "AI usage",
      expect.objectContaining({ outcome: "failure", durationMs: 45 }),
    );
  });

  it("logs successful usage and preserves the handler result", async () => {
    const setup = options();
    const handler = {
      createActivityLogFromSpeech: vi.fn().mockResolvedValue(RESULT),
    };
    const decorated = newAIActivityLogUsageHandler(handler, setup.options);

    await expect(
      decorated.createActivityLogFromSpeech(USER_ID, PARAMS),
    ).resolves.toEqual(RESULT);

    expect(setup.options.consumeQuota).toHaveBeenCalledOnce();
    expect(setup.logger.info).toHaveBeenCalledWith(
      "AI usage",
      expect.objectContaining({ outcome: "success", durationMs: 45 }),
    );
  });
});
