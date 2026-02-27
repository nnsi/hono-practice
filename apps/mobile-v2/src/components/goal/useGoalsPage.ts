import { useMemo, useState } from "react";
import { isGoalActive } from "@packages/domain/goal/goalPredicates";
import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import { useActivities } from "../../hooks/useActivities";
import { useGoals } from "../../hooks/useGoals";
import { goalRepository } from "../../repositories/goalRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { CreateGoalPayload, UpdateGoalPayload } from "./types";

export function useGoalsPage() {
  // --- state ---
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [recordActivity, setRecordActivity] = useState<ActivityRecord | null>(
    null,
  );

  // --- data ---
  const { activities } = useActivities();
  const { goals } = useGoals();

  // --- computed ---
  const activityMap = useMemo(() => {
    const map = new Map<string, ActivityRecord>();
    for (const a of activities) {
      map.set(a.id, a);
    }
    return map;
  }, [activities]);

  const currentGoals = useMemo(
    () => goals.filter((g) => isGoalActive(g)),
    [goals],
  );
  const pastGoals = useMemo(
    () => goals.filter((g) => !isGoalActive(g)),
    [goals],
  );

  // --- handlers ---
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

  // --- return ---
  return {
    // data
    activities,
    goals,
    activityMap,
    currentGoals,
    pastGoals,
    // dialog state
    createDialogOpen,
    setCreateDialogOpen,
    editingGoalId,
    setEditingGoalId,
    expandedGoalId,
    recordActivity,
    setRecordActivity,
    // handlers
    handleGoalCreated,
    handleGoalUpdated,
    handleGoalDeleted,
    handleToggleExpand,
  };
}
