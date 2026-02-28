import dayjs from "dayjs";
import { isGoalActive, isGoalEnded } from "@packages/domain/goal/goalPredicates";
import type {
  ReactHooks,
  ActivityBase,
  Goal,
  CreateGoalPayload,
  UpdateGoalPayload,
} from "./types";

type UseGoalsPageDeps<TActivity extends ActivityBase> = {
  react: Pick<ReactHooks, "useState" | "useMemo">;
  useActivities: () => { activities: TActivity[] };
  useGoals: () => { goals: Goal[] };
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
    const { activities } = useActivities();
    const { goals } = useGoals();

    // computed
    const today = dayjs().format("YYYY-MM-DD");

    const activityMap = useMemo(() => {
      const map = new Map<string, TActivity>();
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

    return {
      activeTab,
      setActiveTab,
      activities,
      goals,
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
