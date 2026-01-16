import { Card, CardContent } from "@components/ui";
import type { GetActivityResponse } from "@dtos/response";
import { ActivityLogCreateDialog } from "@frontend/components/activity/ActivityLogCreateDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@frontend/components/ui";
import { useDailyActivityCreate } from "@frontend/hooks/feature/daily/useDailyActivityCreate";

export function DailyActivityLogCreateDialog({
  open,
  onOpenChange,
  date,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  onSuccess?: () => void;
}) {
  const { stateProps, actions } = useDailyActivityCreate(
    onOpenChange,
    onSuccess,
  );
  const { selectedActivity, activityDialogOpen, activities } = stateProps;

  return (
    <>
      <Dialog open={open && !activityDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>アクティビティを選択</DialogTitle>
            <DialogDescription>
              記録するアクティビティを選んでください
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {activities?.map((activity: GetActivityResponse) => (
              <Card
                key={activity.id}
                onClick={() => actions.onActivitySelect(activity)}
                className="cursor-pointer shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 h-16"
              >
                <CardContent className="flex items-center gap-4 p-0 px-4 h-full">
                  <span className="flex items-center justify-center w-10 h-10 text-3xl">
                    {activity.iconType === "upload" &&
                    activity.iconThumbnailUrl ? (
                      <img
                        src={activity.iconThumbnailUrl}
                        alt={activity.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      activity.emoji
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="text-base font-medium">{activity.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.quantityUnit}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {selectedActivity && (
        <ActivityLogCreateDialog
          open={activityDialogOpen}
          onOpenChange={actions.onActivityDialogClose}
          activity={selectedActivity}
          date={date}
          onSuccess={actions.onSuccess}
        />
      )}
    </>
  );
}
