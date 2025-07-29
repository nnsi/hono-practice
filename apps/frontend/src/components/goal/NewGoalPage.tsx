import { useNewGoalPage } from "@frontend/hooks/feature/goal/useNewGoalPage";
import { useAppSettings } from "@frontend/hooks/feature/setting/useAppSettings";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import { Card, CardContent } from "@components/ui";

import { NewGoalCard } from "./NewGoalCard";
import { NewGoalDialog } from "./NewGoalDialog";

export const NewGoalPage: React.FC = () => {
  const { settings } = useAppSettings();
  const {
    editingGoalId,
    createDialogOpen,
    setCreateDialogOpen,
    goalsLoading,
    currentGoals,
    pastGoals,
    activitiesData,
    getActivityName,
    getActivityEmoji,
    getActivityIcon,
    getActivityUnit,
    getActivity,
    createEditStartHandler,
    handleEditEnd,
    handleGoalCreated,
  } = useNewGoalPage();

  if (goalsLoading) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <hr className="mt-12 mb-6" />
      {/* 現在の目標 */}
      <div className="flex flex-col gap-2">
        {currentGoals.map((goal) => (
          <NewGoalCard
            key={goal.id}
            goal={goal}
            activityName={getActivityName(goal.activityId)}
            activityEmoji={getActivityEmoji(goal.activityId)}
            activityIcon={getActivityIcon(goal.activityId)}
            quantityUnit={getActivityUnit(goal.activityId)}
            isEditing={editingGoalId === goal.id}
            onEditStart={createEditStartHandler(goal.id)}
            onEditEnd={handleEditEnd}
            activities={activitiesData || []}
            activity={getActivity(goal.activityId)}
            hideGraph={settings.hideGoalGraph}
          />
        ))}

        <Card
          onClick={() => setCreateDialogOpen(true)}
          className="w-full h-20 cursor-pointer shadow-sm rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md hover:border-gray-400 transition-all duration-200 group"
        >
          <CardContent className="flex items-center justify-center gap-2 p-0 h-full">
            <PlusCircledIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            <span className="text-sm text-gray-500 group-hover:text-gray-700">
              新規目標を追加
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 過去の目標 */}
      {pastGoals.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-600 mt-8 mb-4">
            過去の目標
          </h2>
          <div className="flex flex-col gap-2">
            {pastGoals.map((goal) => (
              <NewGoalCard
                key={goal.id}
                goal={goal}
                activityName={getActivityName(goal.activityId)}
                activityEmoji={getActivityEmoji(goal.activityId)}
                activityIcon={getActivityIcon(goal.activityId)}
                quantityUnit={getActivityUnit(goal.activityId)}
                isEditing={editingGoalId === goal.id}
                onEditStart={createEditStartHandler(goal.id)}
                onEditEnd={handleEditEnd}
                activities={activitiesData || []}
                activity={getActivity(goal.activityId)}
                isPast={true}
                hideGraph={settings.hideGoalGraph}
              />
            ))}
          </div>
        </>
      )}

      <NewGoalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        activities={activitiesData || []}
        onSuccess={handleGoalCreated}
      />
    </div>
  );
};
