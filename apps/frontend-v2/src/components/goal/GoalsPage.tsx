import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Target,
  Plus,
  Loader2,
} from "lucide-react";
import { useActivities } from "../../hooks/useActivities";
import type { DexieActivity } from "../../db/schema";
import type { CreateGoalPayload, Goal, UpdateGoalPayload } from "./types";
import { createGoalApi, deleteGoalApi, fetchGoals, updateGoalApi } from "../../api/goalApi";
import { GoalCard } from "./GoalCard";
import { CreateGoalDialog } from "./CreateGoalDialog";

export function GoalsPage() {
  const { activities } = useActivities();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGoals();
      setGoals(data);
    } catch {
      setError("目標の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const activityMap = useMemo(() => {
    const map = new Map<string, DexieActivity>();
    for (const a of activities) {
      map.set(a.id, a);
    }
    return map;
  }, [activities]);

  const currentGoals = useMemo(
    () => goals.filter((g) => g.isActive),
    [goals],
  );
  const pastGoals = useMemo(
    () => goals.filter((g) => !g.isActive),
    [goals],
  );

  const handleGoalCreated = async (payload: CreateGoalPayload) => {
    const newGoal = await createGoalApi(payload);
    setGoals((prev) => [...prev, newGoal]);
    setCreateDialogOpen(false);
  };

  const handleGoalUpdated = async (goalId: string, payload: UpdateGoalPayload) => {
    try {
      const updated = await updateGoalApi(goalId, payload);
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)));
      setEditingGoalId(null);
    } catch {
      setError("目標の更新に失敗しました");
    }
  };

  const handleGoalDeleted = async (goalId: string) => {
    try {
      await deleteGoalApi(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch {
      setError("目標の削除に失敗しました");
    }
  };

  const handleToggleExpand = (goalId: string) => {
    setExpandedGoalId((prev) => (prev === goalId ? null : goalId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          type="button"
          onClick={loadGoals}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Target size={20} />
            目標
          </h1>
          <span className="text-sm text-gray-500">
            {currentGoals.length}件の目標
          </span>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* 現在の目標 */}
        {currentGoals.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Target size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">まだ目標がありません</p>
          </div>
        )}

        {currentGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            activity={activityMap.get(goal.activityId)}
            isExpanded={expandedGoalId === goal.id}
            isEditing={editingGoalId === goal.id}
            onToggleExpand={() => handleToggleExpand(goal.id)}
            onEditStart={() => setEditingGoalId(goal.id)}
            onEditEnd={() => setEditingGoalId(null)}
            onUpdate={(payload) => handleGoalUpdated(goal.id, payload)}
            onDelete={() => handleGoalDeleted(goal.id)}
          />
        ))}

        {/* 新規目標を追加 */}
        <button
          type="button"
          onClick={() => setCreateDialogOpen(true)}
          className="w-full h-20 rounded-xl border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <Plus size={20} className="text-gray-400 group-hover:text-gray-600" />
          <span className="text-sm text-gray-500 group-hover:text-gray-700">
            新規目標を追加
          </span>
        </button>

        {/* 過去の目標 */}
        {pastGoals.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold text-gray-500 mb-3">
              過去の目標
            </h2>
            <div className="space-y-3">
              {pastGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  activity={activityMap.get(goal.activityId)}
                  isExpanded={expandedGoalId === goal.id}
                  isEditing={false}
                  isPast
                  onToggleExpand={() => handleToggleExpand(goal.id)}
                  onEditStart={() => {}}
                  onEditEnd={() => {}}
                  onUpdate={() => Promise.resolve()}
                  onDelete={() => handleGoalDeleted(goal.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 作成ダイアログ */}
      {createDialogOpen && (
        <CreateGoalDialog
          activities={activities}
          onClose={() => setCreateDialogOpen(false)}
          onCreate={handleGoalCreated}
        />
      )}
    </div>
  );
}
