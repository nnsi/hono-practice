import { useState } from "react";

import { WeeklyBar } from "@frontend/components/activity/WeeklyBar";
import { apiClient } from "@frontend/utils/apiClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";

import {
  GetActivitiesResponseSchema,
  GetActivityLogsResponseSchema,
  GetActivityStatsResponseSchema,
} from "@dtos/response";

import { Button, useToast } from "@components/ui";

import { ActivityTabs } from "@components/activity";

const ActivityPage: React.FC = () => {
  const api = apiClient;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date | undefined>(new Date());
  const [mode, setMode] = useState<"daily" | "statistics">("daily");
  const navigate = useNavigate();

  const activitiesQuery = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await api.users.activities.$get();

      const json = await res.json();
      const parsedJson = GetActivitiesResponseSchema.safeParse(json);
      if (!parsedJson.success) {
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive",
        });
        return;
      }

      return parsedJson.data;
    },
  });

  const dailyActivityLogsQuery = useQuery({
    queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
    queryFn: async () => {
      const dateStr = dayjs(date).format("YYYY-MM-DD");
      const res = await api.users["activity-logs"].$get({
        query: {
          date: dateStr,
        },
      });
      if (res.status !== 200) {
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive",
        });
        return;
      }
      const json = await res.json();
      const parsedJson = GetActivityLogsResponseSchema.safeParse(json);
      if (!parsedJson.success) {
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive",
        });
        return;
      }
      return parsedJson.data;
    },
  });

  const monthlyActivityLogsQuery = useQuery({
    queryKey: ["activity-stats-monthly", dayjs(month).format("YYYY-MM")],
    queryFn: async () => {
      const monthStr = dayjs(month).format("YYYY-MM");
      const res = await api.users["activity-logs"].stats.$get({
        query: {
          date: monthStr,
        },
      });

      const json = await res.json();
      const parsedJson = GetActivityStatsResponseSchema.safeParse(json);
      if (!parsedJson.success) {
        toast({
          title: "Error",
          description: "Failed to parse stats",
          variant: "destructive",
        });
        return;
      }
      return parsedJson.data;
    },
  });

  const changeMode = (newMode: "daily" | "statistics") => {
    if (mode === newMode) return;
    setMode(newMode);
    if (newMode === "statistics") {
      queryClient.invalidateQueries({
        queryKey: ["activity-stats-monthly", dayjs(month).format("YYYY-MM")],
      });
    }
  };

  const handleDateChange = (newDate?: Date) => {
    setDate(newDate);
    changeMode("daily");
  };

  const handleMonthChange = (newMonth?: Date) => {
    setMonth(newMonth);
    changeMode("statistics");
  };

  return (
    <>
      <title>App / Activity</title>
      <div className="grid gap-3 max-w-3xl grid-cols-3 md:grid-cols-7">
        <div className="flex gap-5 flex-col col-span-3">
          <div className="flex justify-center">
            <WeeklyBar
              selected={date}
              onSelect={handleDateChange}
              onMonthChange={handleMonthChange}
              className="w-full"
            />
          </div>
          <Button
            onClick={() => navigate({ to: "/activity/setting" })}
            variant="secondary"
            className="w-full"
          >
            Setting
          </Button>
        </div>
        <div className="col-span-4">
          <ActivityTabs
            mode={mode}
            date={date}
            month={month}
            changeMode={changeMode}
            activities={activitiesQuery.data}
            dailyActivityLogs={dailyActivityLogsQuery.data}
            activityStats={monthlyActivityLogsQuery.data}
          />
          <Outlet />
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute("/activity")({
  component: ActivityPage,
});
