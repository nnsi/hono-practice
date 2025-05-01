import { useState, useRef } from "react";

import { Card, CardContent } from "@frontend/components/ui";
import { useGlobalDate } from "@frontend/hooks";
import { apiClient } from "@frontend/utils";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  GetActivitiesResponseSchema,
  GetActivityLogsResponseSchema,
  type GetActivityResponse,
  type GetActivityLogsResponse,
} from "@dtos/response";

import { ActivityDateHeader } from "./ActivityDateHeader";

import {
  ActivityEditDialog,
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
  const queryClient = useQueryClient();

  const { data, error } = useQuery<{
    activities: GetActivityResponse[];
    activityLogs: GetActivityLogsResponse;
  }>({
    queryKey: [
      "activity",
      "activity-logs-daily",
      dayjs(date).format("YYYY-MM-DD"),
    ],
    queryFn: async () => {
      const res = await apiClient.batch.$post({
        json: [
          {
            path: "/users/activities",
          },
          {
            path: `/users/activity-logs?date=${dayjs(date).format("YYYY-MM-DD")}`,
          },
        ],
      });
      const json = await res.json();

      const activities = GetActivitiesResponseSchema.safeParse(json[0]);
      if (!activities.success) {
        throw new Error("Failed to parse activities");
      }
      const activityLogs = GetActivityLogsResponseSchema.safeParse(json[1]);
      if (!activityLogs.success) {
        throw new Error("Failed to parse activity logs");
      }

      queryClient.setQueryData(["activity"], activities.data);
      queryClient.setQueryData(
        ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
        activityLogs.data,
      );
      return { activities: activities.data, activityLogs: activityLogs.data };
    },
  });

  if (error) {
    console.error(error);
  }

  const activities = data?.activities ?? [];
  const activityLogs = data?.activityLogs ?? [];

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
        {activities.map((activity: GetActivityResponse) => {
          const hasActivityLogs = activityLogs.some(
            (log: GetActivityLogsResponse[number]) =>
              log.activity.id === activity.id,
          );

          return (
            <ActivityCard
              key={activity.id}
              onClick={() => handleActivityClick(activity)}
              onPointerDown={() => handleActivityCardPointerDown(activity)}
              onPointerUp={handleActivityCardPointerUp}
              onPointerLeave={handleActivityCardPointerUp}
              isDone={hasActivityLogs}
            >
              <div className="text-5xl mb-2">{activity.emoji}</div>
              <div className="text-sm text-gray-800 font-medium">
                {activity.name}
              </div>
            </ActivityCard>
          );
        })}
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
      <ActivityEditDialog
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
  isDone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  isDone?: boolean;
}) {
  return (
    <Card
      className={`flex items-center justify-center py-6 shadow-md rounded-3xl cursor-pointer hover:bg-gray-100 select-none ${
        isDone ? "bg-lime-100" : ""
      }`}
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
