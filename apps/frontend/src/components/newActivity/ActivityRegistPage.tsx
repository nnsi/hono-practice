import { useState, useRef } from "react";

import { Card, CardContent } from "@frontend/components/ui";
import { useGlobalDate } from "@frontend/hooks";
import { apiClient, qp } from "@frontend/utils";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";

import {
  GetActivitiesResponseSchema,
  type GetActivityResponse,
} from "@dtos/response";

import { ActivityDateHeader } from "./ActivityDateHeader";

import {
  ActivityEditModal,
  ActivityLogCreateDialog,
  NewActivityDialog,
} from ".";

export const ActivityRegistPage: React.FC = () => {
  const { date, setDate } = useGlobalDate();
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<GetActivityResponse | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetActivity, setEditTargetActivity] =
    useState<GetActivityResponse | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const { data: activities, error: _activitiesError } = useQuery({
    ...qp({
      queryKey: ["tasks"],
      queryFn: () => apiClient.users.activities.$get(),
      schema: GetActivitiesResponseSchema,
    }),
  });

  /* activity-logsを取得したい時があるかも
  useQuery({
    ...qp({
      queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      queryFn: () =>
        apiClient.users["activity-logs"].$get({
          query: {
            date: dayjs(date).format("YYYY-MM-DD"),
          },
        }),
      schema: GetActivityLogsResponseSchema,
    }),
  });
  */

  const handleActivityClick = (activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setOpen(true);
  };

  const handleNewActivityClick = () => {
    setOpen(true);
  };

  const handleActivityCardPointerDown = (activity: GetActivityResponse) => {
    longPressTimer.current = window.setTimeout(() => {
      setEditTargetActivity(activity);
      setEditModalOpen(true);
    }, 700);
  };

  const handleActivityCardPointerUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <>
      <ActivityDateHeader date={date} setDate={setDate} />
      <hr className="my-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 items-center justify-center">
        {activities?.map((activity) => (
          <ActivityCard
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            onPointerDown={() => handleActivityCardPointerDown(activity)}
            onPointerUp={handleActivityCardPointerUp}
            onPointerLeave={handleActivityCardPointerUp}
          >
            <div className="text-5xl mb-2">{activity.emoji}</div>
            <div className="text-sm text-gray-800 font-medium">
              {activity.name}
            </div>
          </ActivityCard>
        ))}
        <ActivityCard onClick={handleNewActivityClick}>
          <div className="text-5xl mb-2">
            <PlusIcon className="w-16 h-16" />
          </div>
        </ActivityCard>
      </div>
      <NewActivityDialog
        open={open && !selectedActivity}
        onOpenChange={setOpen}
      />
      {selectedActivity && (
        <ActivityLogCreateDialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setSelectedActivity(null);
          }}
          activity={selectedActivity}
          date={date}
        />
      )}
      <ActivityEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        activity={editTargetActivity}
      />
    </>
  );
};

function ActivityCard({
  children,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: {
  children: React.ReactNode;
  onClick: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <Card
      className="flex items-center justify-center py-6 shadow-md rounded-3xl cursor-pointer hover:bg-gray-100 select-none"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <CardContent className="flex flex-col items-center justify-center py-0">
        {children}
      </CardContent>
    </Card>
  );
}
