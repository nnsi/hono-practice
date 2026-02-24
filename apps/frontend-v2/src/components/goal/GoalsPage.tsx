import dayjs from "dayjs";
import { Target, Plus } from "lucide-react";
import { GoalCard } from "./GoalCard";
import { CreateGoalDialog } from "./CreateGoalDialog";
import { RecordDialog } from "../actiko/RecordDialog";
import { useGoalsPage } from "./useGoalsPage";

export function GoalsPage() {
  const {
    activities,
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
  } = useGoalsPage();

  return (
    <div className="bg-white">
      {/* ヘッダー */}
      <header className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-between px-4 pr-14 h-12">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Target size={20} className="text-amber-500" />
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

        {currentGoals.map((goal) => {
          const act = activityMap.get(goal.activityId);
          return (
            <GoalCard
              key={goal.id}
              goal={goal}
              activity={act}
              isExpanded={expandedGoalId === goal.id}
              isEditing={editingGoalId === goal.id}
              onToggleExpand={() => handleToggleExpand(goal.id)}
              onEditStart={() => setEditingGoalId(goal.id)}
              onEditEnd={() => setEditingGoalId(null)}
              onUpdate={(payload) => handleGoalUpdated(goal.id, payload)}
              onDelete={() => handleGoalDeleted(goal.id)}
              onRecordOpen={act ? () => setRecordActivity(act) : undefined}
            />
          );
        })}

        {/* 新規目標を追加 */}
        <button
          type="button"
          onClick={() => setCreateDialogOpen(true)}
          className="w-full h-20 rounded-xl border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <Plus
            size={20}
            className="text-gray-400 group-hover:text-gray-600"
          />
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

      {/* A. ログ作成ダイアログ */}
      {recordActivity && (
        <RecordDialog
          activity={recordActivity}
          date={dayjs().format("YYYY-MM-DD")}
          onClose={() => setRecordActivity(null)}
        />
      )}
    </div>
  );
}
