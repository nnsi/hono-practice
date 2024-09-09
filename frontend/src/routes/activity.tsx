import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApiClient } from "../hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@ui/use-toast";
import { Calendar } from "@ui/calendar";
import dayjs from "dayjs";
import { ActivityTabs } from "../components";

const ActivityPage: React.FC = () => {
  const api = useApiClient();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date | undefined>(new Date());
  const [mode, setMode] = useState<"daily" | "monthly">("daily");

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
      return json;
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
      return json;
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
      return json;
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
      <div className="grid grid-cols-12">
        <div className="col-span-4">
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
        </div>
        <div className="col-span-8">
          <ActivityTabs
            mode={mode}
            changeMode={changeMode}
            activities={activitiesQuery.data}
            dailyActivityLogs={dailyActivityLogsQuery.data}
            monthlyActivityLogs={monthlyActivityLogsQuery.data}
          />
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute("/activity")({
  component: ActivityPage,
});
