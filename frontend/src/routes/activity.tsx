import { useState } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useApiClient } from "../hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@ui/use-toast";
import { Calendar } from "@ui/calendar";
import dayjs from "dayjs";
import { ActivityTabs, Button } from "../components";
import { GetActivitiesResponseSchema } from "@/types/response/GetActivitiesResponse";
import { GetActivityLogsResponseSchema } from "@/types/response/GetActivityLogsResponse";

const ActivityPage: React.FC = () => {
  const api = useApiClient();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date | undefined>(new Date());
  const [mode, setMode] = useState<"daily" | "monthly">("daily");
  const navigate = useNavigate();

  const activitiesQuery = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await api.users.activities.$get();
      if (res.status !== 200) {
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive",
        });
        return;
      }
      const json = await res.json();
      const parsedJson = GetActivitiesResponseSchema.safeParse(json);
      if (!parsedJson.success) {
        console.log(parsedJson.error);
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
      const res = await api.users["activity-logs"].daily[":date"].$get({
        param: {
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
    queryKey: ["activity-logs-monthly", dayjs(month).format("YYYY-MM")],
    queryFn: async () => {
      const monthStr = dayjs(month).format("YYYY-MM");
      const res = await api.users["activity-logs"].monthly[":month"].$get({
        param: {
          month: monthStr,
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

  const changeMode = (mode: "daily" | "monthly") => {
    setMode(mode);
  };

  const handleDateChange = (newDate?: Date) => {
    setDate(newDate);
    changeMode("daily");
  };

  const handleMonthChange = (newMonth?: Date) => {
    setMonth(newMonth);
    changeMode("monthly");
  };

  return (
    <>
      <div className="grid grid-cols-5 gap-5 max-w-3xl mx-auto">
        <div className="max-w-sm col-span-2">
          <div className="flex flex-shrink justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
              month={month}
              onMonthChange={handleMonthChange}
              className="rounded-md border shadow"
            />
          </div>
          <Button
            onClick={() => navigate({ to: "/activity/new" })}
            variant="secondary"
            className="my-5 w-full"
          >
            New Activity
          </Button>
        </div>
        <div className="col-span-3">
          <ActivityTabs
            mode={mode}
            date={date}
            month={month}
            changeMode={changeMode}
            activities={activitiesQuery.data}
            dailyActivityLogs={dailyActivityLogsQuery.data}
            monthlyActivityLogs={monthlyActivityLogsQuery.data}
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
