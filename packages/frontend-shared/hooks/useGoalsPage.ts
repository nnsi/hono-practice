import {
  isGoalActive,
  isGoalEnded,
} from "@packages/domain/goal/goalPredicates";

import { getToday } from "../utils/dateUtils";
import type {
  ActivityBase,
  CreateGoalPayload,
  Goal,
  ReactHooks,
  UpdateGoalPayload,
} from "./types";

type UseGoalsPageDeps<TActivity extends ActivityBase> = {
  react: Pick<ReactHooks, "useState" | "useMemo">;
  useActivities: () => { activities: TActivity[]; isReady: boolean };
  useGoals: () => { goals: Goal[]; isReady: boolean };
  goalRepository: {
    createGoal: (payload: CreateGoalPayload) => Promise<unknown>;
    updateGoal: (id: string, payload: UpdateGoalPayload) => Promise<unknown>;
    softDeleteGoal: (id: string) => Promise<unknown>;
  };
  syncEngine: { syncGoals: () => void };
};

export function createUseGoalsPage<TActivity extends ActivityBase>(
  deps: UseGoalsPageDeps<TActivity>,
) {
  const {
    react: { useState, useMemo },
    useActivities,
    useGoals,
    goalRepository,
    syncEngine,
  } = deps;

  return function useGoalsPage() {
    // state
    const [activeTab, setActiveTab] = useState<"active" | "ended">("active");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
    const [recordActivity, setRecordActivity] = useState<TActivity | null>(
      null,
    );

    // data
    const { activities, isReady: activitiesReady } = useActivities();
    const { goals, isReady: goalsReady } = useGoals();

    // computed
    const today = getToday();

    const activityMap = useMemo(() => {
      const map = new Map<string, TActivity>();
      for (const a of activities) {
        map.set(a.id, a);
      }
      return map;
    }, [activities]);

    const sortByCreatedAt = (a: Goal, b: Goal) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;

    const currentGoals = useMemo(
      () =>
        goals
          .filter((g) => isGoalActive(g) && !isGoalEnded(g, today))
          .sort(sortByCreatedAt),
      [goals, today],
    );
    const pastGoals = useMemo(
      () =>
        goals
          .filter((g) => !isGoalActive(g) || isGoalEnded(g, today))
          .sort(sortByCreatedAt),
      [goals, today],
    );

    // handlers
    const handleGoalCreated = async (payload: CreateGoalPayload) => {
      await goalRepository.createGoal(payload);
      setCreateDialogOpen(false);
      syncEngine.syncGoals();
    };

    const handleGoalUpdated = async (
      goalId: string,
      payload: UpdateGoalPayload,
    ) => {
      await goalRepository.updateGoal(goalId, payload);
      setEditingGoalId(null);
      syncEngine.syncGoals();
    };

    const handleGoalDeleted = async (goalId: string) => {
      await goalRepository.softDeleteGoal(goalId);
      syncEngine.syncGoals();
    };

    const handleToggleExpand = (goalId: string) => {
      setExpandedGoalId((prev) => (prev === goalId ? null : goalId));
    };

    const dataReady = activitiesReady && goalsReady;

    return {
      activeTab,
      setActiveTab,
      activities,
      goals,
      dataReady,
      activityMap,
      currentGoals,
      pastGoals,
      createDialogOpen,
      setCreateDialogOpen,
      editingGoalId,
      setEditingGoalId,
      expandedGoalId,
      recordActivity,
      setRecordActivity,
      handleGoalCreated,
      handleGoalUpdated,
      handleGoalDeleted,
      handleToggleExpand,
    };
  };
}
