import { AppError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";
import {
  type Activity,
  type ActivityKind,
  createActivityId,
  createActivityKindId,
} from "@packages/domain/activity/activitySchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { ActivityRepository } from "../../activity";
import type { ActivityLogRepository } from "../../activityLog";
import type { AIActivityLogGateway } from "../aiActivityLogGateway";
import { newAIActivityLogGatewayMock } from "../aiActivityLogGatewayMock";
import { newAIActivityLogUsecase } from "../aiActivityLogUsecase";

describe("AIActivityLogUsecase", () => {
  let activityRepo: ActivityRepository;
  let activityLogRepo: ActivityLogRepository;
  let gateway: AIActivityLogGateway;
  let usecase: ReturnType<typeof newAIActivityLogUsecase>;

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const activityId1 = createActivityId("00000000-0000-4000-8000-000000000001");
  const activityKindId1 = createActivityKindId(
    "00000000-0000-4000-8000-000000000002",
  );

  const mockActivityKind: ActivityKind = {
    id: activityKindId1,
    name: "ジョギング",
    orderIndex: "1",
  };

  const mockActivity: Activity = {
    id: activityId1,
    userId: userId1,
    name: "ランニング",
    quantityUnit: "分",
    orderIndex: "1",
    kinds: [mockActivityKind],
    type: "new",
    showCombinedStats: true,
    iconType: "emoji",
    emoji: "🏃",
    iconUrl: null,
    iconThumbnailUrl: null,
    recordingMode: "manual",
  };

  const mockActivityNoKinds: Activity = {
    ...mockActivity,
    id: createActivityId("00000000-0000-4000-8000-000000000003"),
    name: "読書",
    kinds: [],
  };

  beforeEach(() => {
    activityRepo = mock<ActivityRepository>();
    activityLogRepo = mock<ActivityLogRepository>();
    gateway = newAIActivityLogGatewayMock();

    reset(activityRepo);
    reset(activityLogRepo);
  });

  function createUsecase() {
    usecase = newAIActivityLogUsecase(
      gateway,
      instance(activityRepo),
      instance(activityLogRepo),
      noopTracer,
    );
  }

  describe("createActivityLogFromSpeech", () => {
    it("音声テキストからActivityLogを作成できる", async () => {
      when(activityRepo.getActivitiesByUserId(userId1)).thenResolve([
        mockActivity,
      ]);
      when(activityLogRepo.createActivityLog(anything())).thenCall((log) =>
        Promise.resolve(log),
      );
      createUsecase();

      const result = await usecase.createActivityLogFromSpeech(
        userId1,
        "30分ランニングした",
        "2026-03-16",
      );

      expect(result.activityLog.quantity).toBe(30);
      expect(result.activityLog.activity.name).toBe("ランニング");
      expect(result.activityLog.memo).toBe("30分ランニングした");
      expect(result.interpretation.detectedActivityName).toBe("ランニング");
      expect(result.interpretation.rawText).toBe("30分ランニングした");

      verify(activityLogRepo.createActivityLog(anything())).once();
    });

    it("数値が含まれない場合はquantity=1になる", async () => {
      when(activityRepo.getActivitiesByUserId(userId1)).thenResolve([
        mockActivity,
      ]);
      when(activityLogRepo.createActivityLog(anything())).thenCall((log) =>
        Promise.resolve(log),
      );
      createUsecase();

      const result = await usecase.createActivityLogFromSpeech(
        userId1,
        "ランニングした",
        "2026-03-16",
      );

      expect(result.activityLog.quantity).toBe(1);
    });

    it("複数の数値がある場合は最初の数値を採用する", async () => {
      when(activityRepo.getActivitiesByUserId(userId1)).thenResolve([
        mockActivity,
      ]);
      when(activityLogRepo.createActivityLog(anything())).thenCall((log) =>
        Promise.resolve(log),
      );
      createUsecase();

      const result = await usecase.createActivityLogFromSpeech(
        userId1,
        "30分ランニングして5km走った",
        "2026-03-16",
      );

      expect(result.activityLog.quantity).toBe(30);
    });

    it("マッチしない場合は最初のActivityにフォールバックする", async () => {
      when(activityRepo.getActivitiesByUserId(userId1)).thenResolve([
        mockActivity,
      ]);
      when(activityLogRepo.createActivityLog(anything())).thenCall((log) =>
        Promise.resolve(log),
      );
      createUsecase();

      const result = await usecase.createActivityLogFromSpeech(
        userId1,
        "泳いだ",
        "2026-03-16",
      );

      expect(result.activityLog.activity.name).toBe("ランニング");
      expect(result.activityLog.quantity).toBe(1);
    });

    it("ActivityKindがないActivityでもactivityKind=nullで作成できる", async () => {
      when(activityRepo.getActivitiesByUserId(userId1)).thenResolve([
        mockActivityNoKinds,
      ]);
      when(activityLogRepo.createActivityLog(anything())).thenCall((log) =>
        Promise.resolve(log),
      );
      createUsecase();

      const result = await usecase.createActivityLogFromSpeech(
        userId1,
        "読書した",
        "2026-03-16",
      );

      expect(result.activityLog.activity.name).toBe("読書");
      expect(result.activityLog.activityKind).toBeNull();
    });

    it("Activityが0件の場合はAppErrorになる", async () => {
      when(activityRepo.getActivitiesByUserId(userId1)).thenResolve([]);
      createUsecase();

      await expect(
        usecase.createActivityLogFromSpeech(
          userId1,
          "ランニングした",
          "2026-03-16",
        ),
      ).rejects.toThrow(AppError);
    });

    it("GatewayがユーザーのActivitiesにないIDを返した場合はAppErrorになる", async () => {
      const badGateway: AIActivityLogGateway = {
        parseActivityLog: async () => ({
          parsed: {
            activityId: "00000000-0000-4000-8000-999999999999",
            activityKindId: null,
            quantity: 10,
            date: "2026-03-16",
            memo: "test",
          },
          interpretation: {
            detectedActivityName: "存在しない",
            detectedKindName: null,
            rawText: "test",
          },
        }),
      };

      when(activityRepo.getActivitiesByUserId(userId1)).thenResolve([
        mockActivity,
      ]);

      usecase = newAIActivityLogUsecase(
        badGateway,
        instance(activityRepo),
        instance(activityLogRepo),
        noopTracer,
      );

      await expect(
        usecase.createActivityLogFromSpeech(userId1, "何かした", "2026-03-16"),
      ).rejects.toThrow(AppError);
    });
  });
});
