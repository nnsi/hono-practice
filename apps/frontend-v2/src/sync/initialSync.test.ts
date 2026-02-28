import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockApiClientObj } = vi.hoisted(() => ({
  mockApiClientObj: {} as any,
}));

vi.mock("../db/activityRepository");
vi.mock("../db/activityLogRepository");
vi.mock("../db/goalRepository");
vi.mock("../db/taskRepository");
vi.mock("../db/schema", () => ({
  db: {
    activityLogs: { clear: vi.fn() },
    activities: { clear: vi.fn() },
    activityKinds: { clear: vi.fn() },
    goals: { clear: vi.fn() },
    tasks: { clear: vi.fn() },
    activityIconBlobs: { clear: vi.fn() },
    activityIconDeleteQueue: { clear: vi.fn() },
    authState: { clear: vi.fn(), put: vi.fn() },
  },
}));
vi.mock("@packages/sync-engine/mappers/apiMappers");
vi.mock("../utils/apiClient", () => ({
  apiClient: mockApiClientObj,
}));

import { activityRepository } from "../db/activityRepository";
import { activityLogRepository } from "../db/activityLogRepository";
import { goalRepository } from "../db/goalRepository";
import { taskRepository } from "../db/taskRepository";
import { db } from "../db/schema";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiTask,
} from "@packages/sync-engine/mappers/apiMappers";
import {
  clearLocalDataForUserSwitch,
  performInitialSync,
} from "./initialSync";

const mockDb = vi.mocked(db) as any;
const mockActivityRepo = vi.mocked(activityRepository);
const mockLogRepo = vi.mocked(activityLogRepository);
const mockGoalRepo = vi.mocked(goalRepository);
const mockTaskRepo = vi.mocked(taskRepository);

describe("initialSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(mapApiActivity).mockImplementation((a: any) => a);
    vi.mocked(mapApiActivityKind).mockImplementation((k: any) => k);
    vi.mocked(mapApiActivityLog).mockImplementation((l: any) => l);
    vi.mocked(mapApiGoal).mockImplementation((g: any) => g);
    vi.mocked(mapApiTask).mockImplementation((t: any) => t);
  });

  describe("clearLocalDataForUserSwitch", () => {
    it("clears all Dexie tables and localStorage", async () => {
      localStorage.setItem("actiko-v2-lastSyncedAt", "2025-01-01T00:00:00Z");

      await clearLocalDataForUserSwitch();

      expect(mockDb.activityLogs.clear).toHaveBeenCalled();
      expect(mockDb.activities.clear).toHaveBeenCalled();
      expect(mockDb.activityKinds.clear).toHaveBeenCalled();
      expect(mockDb.goals.clear).toHaveBeenCalled();
      expect(mockDb.tasks.clear).toHaveBeenCalled();
      expect(mockDb.activityIconBlobs.clear).toHaveBeenCalled();
      expect(mockDb.activityIconDeleteQueue.clear).toHaveBeenCalled();
      expect(mockDb.authState.clear).toHaveBeenCalled();
      expect(localStorage.getItem("actiko-v2-lastSyncedAt")).toBeNull();
    });
  });

  describe("performInitialSync", () => {
    function setupMockApi(overrides?: {
      activitiesOk?: boolean;
      logsOk?: boolean;
      goalsOk?: boolean;
      tasksOk?: boolean;
    }) {
      const opts = {
        activitiesOk: true,
        logsOk: true,
        goalsOk: true,
        tasksOk: true,
        ...overrides,
      };

      const activitiesGet = vi.fn().mockResolvedValue({
        ok: opts.activitiesOk,
        json: () =>
          Promise.resolve({
            activities: [{ id: "a1", name: "Run" }],
            activityKinds: [{ id: "k1", activityId: "a1", name: "Sprint" }],
          }),
      });
      const logsGet = vi.fn().mockResolvedValue({
        ok: opts.logsOk,
        json: () =>
          Promise.resolve({
            logs: [{ id: "l1", activityId: "a1" }],
          }),
      });
      const goalsGet = vi.fn().mockResolvedValue({
        ok: opts.goalsOk,
        json: () =>
          Promise.resolve({
            goals: [{ id: "g1", activityId: "a1" }],
          }),
      });
      const tasksGet = vi.fn().mockResolvedValue({
        ok: opts.tasksOk,
        json: () =>
          Promise.resolve({
            tasks: [{ id: "t1", title: "Task 1" }],
          }),
      });

      mockApiClientObj.users = {
        v2: {
          activities: { $get: activitiesGet },
          "activity-logs": { $get: logsGet },
          goals: { $get: goalsGet },
          tasks: { $get: tasksGet },
        },
      };

      return { activitiesGet, logsGet, goalsGet, tasksGet };
    }

    it("updates authState with userId", async () => {
      setupMockApi();

      await performInitialSync("user-123");

      expect(mockDb.authState.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "current",
          userId: "user-123",
        }),
      );
    });

    it("fetches all APIs in parallel", async () => {
      const { activitiesGet, logsGet, goalsGet, tasksGet } = setupMockApi();

      await performInitialSync("user-123");

      expect(activitiesGet).toHaveBeenCalled();
      expect(logsGet).toHaveBeenCalled();
      expect(goalsGet).toHaveBeenCalled();
      expect(tasksGet).toHaveBeenCalled();
    });

    it("upserts all data on full success", async () => {
      setupMockApi();

      await performInitialSync("user-123");

      expect(mockActivityRepo.upsertActivities).toHaveBeenCalledWith([
        { id: "a1", name: "Run" },
      ]);
      expect(mockActivityRepo.upsertActivityKinds).toHaveBeenCalledWith([
        { id: "k1", activityId: "a1", name: "Sprint" },
      ]);
      expect(
        mockLogRepo.upsertActivityLogsFromServer,
      ).toHaveBeenCalledWith([{ id: "l1", activityId: "a1" }]);
      expect(mockGoalRepo.upsertGoalsFromServer).toHaveBeenCalledWith([
        { id: "g1", activityId: "a1" },
      ]);
      expect(mockTaskRepo.upsertTasksFromServer).toHaveBeenCalledWith([
        { id: "t1", title: "Task 1" },
      ]);
    });

    it("stores lastSyncedAt on full success", async () => {
      setupMockApi();

      await performInitialSync("user-123");

      expect(
        localStorage.getItem("actiko-v2-lastSyncedAt"),
      ).not.toBeNull();
    });

    it("handles partial failures (allSynced = false)", async () => {
      setupMockApi({ goalsOk: false });

      await performInitialSync("user-123");

      // Activities and logs still processed
      expect(mockActivityRepo.upsertActivities).toHaveBeenCalled();
      expect(
        mockLogRepo.upsertActivityLogsFromServer,
      ).toHaveBeenCalled();
      expect(mockTaskRepo.upsertTasksFromServer).toHaveBeenCalled();

      // Goals not processed (failed)
      expect(mockGoalRepo.upsertGoalsFromServer).not.toHaveBeenCalled();

      // lastSyncedAt NOT stored when partial failure
      expect(localStorage.getItem("actiko-v2-lastSyncedAt")).toBeNull();
    });

    it("uses since parameter when lastSyncedAt exists", async () => {
      localStorage.setItem(
        "actiko-v2-lastSyncedAt",
        "2025-06-01T00:00:00Z",
      );
      const { activitiesGet, logsGet, goalsGet, tasksGet } = setupMockApi();

      await performInitialSync("user-123");

      // activity-logs, goals, tasks use since query
      expect(logsGet).toHaveBeenCalledWith({
        query: { since: "2025-06-01T00:00:00Z" },
      });
      expect(goalsGet).toHaveBeenCalledWith({
        query: { since: "2025-06-01T00:00:00Z" },
      });
      expect(tasksGet).toHaveBeenCalledWith({
        query: { since: "2025-06-01T00:00:00Z" },
      });

      // activities does NOT use since query (always full fetch)
      expect(activitiesGet).toHaveBeenCalledWith();
    });

    it("does not use since parameter on first sync", async () => {
      const { logsGet, goalsGet, tasksGet } = setupMockApi();

      await performInitialSync("user-123");

      expect(logsGet).toHaveBeenCalledWith({ query: {} });
      expect(goalsGet).toHaveBeenCalledWith({ query: {} });
      expect(tasksGet).toHaveBeenCalledWith({ query: {} });
    });

    it("Promise.all内のAPI呼び出しがrejectした場合、エラーが伝播する", async () => {
      mockApiClientObj.users = {
        v2: {
          activities: {
            $get: vi.fn().mockRejectedValue(new Error("Network error")),
          },
          "activity-logs": {
            $get: vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ logs: [] }),
            }),
          },
          goals: {
            $get: vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ goals: [] }),
            }),
          },
          tasks: {
            $get: vi.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ tasks: [] }),
            }),
          },
        },
      };

      await expect(performInitialSync("user-123")).rejects.toThrow(
        "Network error",
      );

      // lastSyncedAt は保存されない
      expect(localStorage.getItem("actiko-v2-lastSyncedAt")).toBeNull();
    });
  });
});
