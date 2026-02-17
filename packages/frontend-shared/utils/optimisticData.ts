import type {
  CreateActivityLogRequest,
  CreateActivityRequest,
  CreateGoalRequest,
  CreateTaskRequest,
} from "@dtos/request";
import type {
  GetActivityLogResponse,
  GetActivityResponse,
  GetTaskResponse,
  GoalResponse,
} from "@dtos/response";
import { v4 as uuidv4 } from "uuid";

/**
 * 楽観的データであることを示すマーカー付きの型
 */
export type OptimisticMarker = {
  _isOptimistic: true;
};

export function isOptimisticData<T>(data: T): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "_isOptimistic" in data &&
    (data as any)._isOptimistic === true
  );
}

/**
 * ActivityLog の楽観的データを構築
 * キャッシュ済みの activities データから activity 情報を取得して完全なレスポンス型を構築する
 */
export function buildOptimisticActivityLog(
  input: CreateActivityLogRequest,
  activities: GetActivityResponse[],
): GetActivityLogResponse & OptimisticMarker {
  const activity = activities.find((a) => a.id === input.activityId);
  const activityKind =
    input.activityKindId && activity
      ? (activity.kinds.find((k) => k.id === input.activityKindId) ?? null)
      : null;

  return {
    id: input.id ?? uuidv4(),
    date: input.date,
    quantity: input.quantity ?? null,
    memo: input.memo ?? "",
    createdAt: new Date(),
    updatedAt: new Date(),
    activity: {
      id: input.activityId ?? "",
      name: activity?.name ?? "",
      quantityUnit: activity?.quantityUnit ?? "",
      emoji: activity?.emoji,
      iconType:
        activity?.iconType === "generate" ? undefined : activity?.iconType,
      iconUrl: activity?.iconUrl,
      iconThumbnailUrl: activity?.iconThumbnailUrl,
    },
    activityKind: activityKind
      ? {
          id: activityKind.id,
          name: activityKind.name,
          color: activityKind.color,
        }
      : null,
    _isOptimistic: true,
  };
}

/**
 * Task の楽観的データを構築
 */
export function buildOptimisticTask(
  input: CreateTaskRequest,
): GetTaskResponse & OptimisticMarker {
  return {
    id: uuidv4(),
    userId: "",
    title: input.title,
    startDate: input.startDate,
    dueDate: input.dueDate ?? null,
    doneDate: null,
    memo: input.memo ?? null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: null,
    _isOptimistic: true,
  };
}

/**
 * Goal の楽観的データを構築
 */
export function buildOptimisticGoal(
  input: CreateGoalRequest,
): GoalResponse & OptimisticMarker {
  return {
    id: uuidv4(),
    userId: "",
    activityId: input.activityId,
    isActive: true,
    description: input.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dailyTargetQuantity: input.dailyTargetQuantity,
    startDate: input.startDate,
    endDate: input.endDate,
    currentBalance: 0,
    totalTarget: 0,
    totalActual: 0,
    inactiveDates: [],
    _isOptimistic: true,
  };
}

/**
 * Activity の楽観的データを構築
 */
export function buildOptimisticActivity(
  input: CreateActivityRequest,
): GetActivityResponse & OptimisticMarker {
  return {
    id: uuidv4(),
    name: input.name,
    emoji: input.emoji,
    iconType: input.iconType ?? "emoji",
    iconUrl: null,
    iconThumbnailUrl: null,
    description: input.description,
    quantityUnit: input.quantityUnit,
    kinds: (input.kinds ?? []).map((k) => ({
      id: uuidv4(),
      name: k.name,
      color: k.color ?? null,
    })),
    showCombinedStats: input.showCombinedStats ?? false,
    _isOptimistic: true,
  };
}
