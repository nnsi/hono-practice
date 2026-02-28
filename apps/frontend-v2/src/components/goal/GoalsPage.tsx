import dayjs from "dayjs";
import { Plus } from "lucide-react";
import { GoalCard } from "./GoalCard";
import { CreateGoalDialog } from "./CreateGoalDialog";
import { RecordDialog } from "../actiko/RecordDialog";
import { useGoalsPage } from "./useGoalsPage";

export function GoalsPage() {
  const {
    activeTab,
    setActiveTab,
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
    <div className="bg-white min-h-full">
      {/* タブ */}
      <div className="sticky top-0 sticky-header z-10">
        <div className="flex items-center px-1 pr-14 h-12">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2.5 text-sm font-medium text-center rounded-xl transition-all mx-0.5 ${
              activeTab === "active"
                ? "text-gray-900 bg-white shadow-soft"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            アクティブ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ended")}
            className={`flex-1 py-2.5 text-sm font-medium text-center rounded-xl transition-all mx-0.5 ${
              activeTab === "ended"
                ? "text-gray-900 bg-white shadow-soft"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            終了済み
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4">
        {activeTab === "active" && (
          <div className="space-y-4">
            {currentGoals.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">アクティブな目標がありません</p>
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
          </div>
        )}

        {activeTab === "ended" && (
          <div className="space-y-4">
            {pastGoals.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">終了済みの目標はありません</p>
              </div>
            )}

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
        )}
      </div>

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
