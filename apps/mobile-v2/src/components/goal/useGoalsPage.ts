import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { isGoalActive, isGoalEnded } from "@packages/domain/goal/goalPredicates";
import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import { useActivities } from "../../hooks/useActivities";
import { useGoals } from "../../hooks/useGoals";
import { goalRepository } from "../../repositories/goalRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { CreateGoalPayload, UpdateGoalPayload } from "./types";

export function useGoalsPage() {
  // --- state ---
  const [activeTab, setActiveTab] = useState<"active" | "ended">("active");
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
  const today = dayjs().format("YYYY-MM-DD");

  const activityMap = useMemo(() => {
    const map = new Map<string, ActivityRecord>();
    for (const a of activities) {
      map.set(a.id, a);
    }
    return map;
  }, [activities]);

  const currentGoals = useMemo(
    () => goals.filter((g) => isGoalActive(g) && !isGoalEnded(g, today)),
    [goals, today],
  );
  const pastGoals = useMemo(
    () => goals.filter((g) => !isGoalActive(g) || isGoalEnded(g, today)),
    [goals, today],
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
    // tab
    activeTab,
    setActiveTab,
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
