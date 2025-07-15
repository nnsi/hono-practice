import { useState } from "react";

import { ActivityLogCreateDialog } from "@frontend/components/activity/ActivityLogCreateDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@frontend/components/ui";
import { useActivities } from "@frontend/hooks/api";

import type { GetActivityResponse } from "@dtos/response";

import { Card, CardContent } from "@components/ui";

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
  const [selectedActivity, setSelectedActivity] =
    useState<GetActivityResponse | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const { data: activities } = useActivities();

  const handleActivitySelect = (activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setActivityDialogOpen(true);
  };

  const handleActivityDialogClose = (open: boolean) => {
    setActivityDialogOpen(open);
    if (!open) {
      setSelectedActivity(null);
    }
  };

  const handleSuccess = () => {
    setSelectedActivity(null);
    setActivityDialogOpen(false);
    onOpenChange(false);
    onSuccess?.();
  };

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
            {activities?.map((activity) => (
              <Card
                key={activity.id}
                onClick={() => handleActivitySelect(activity)}
                className="cursor-pointer shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 h-16"
              >
                <CardContent className="flex items-center gap-4 p-0 px-4 h-full">
                  <span className="flex items-center justify-center w-10 h-10 text-3xl">
                    {activity.emoji}
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
          onOpenChange={handleActivityDialogClose}
          activity={selectedActivity}
          date={date}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
