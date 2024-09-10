import { GetActivitiesResponse } from "@/types/response/GetActivitiesResponse";
import {
  GetActivityLogResponseSchema,
  GetActivityLogsResponse,
} from "@/types/response/GetActivityLogsResponse";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  useToast,
} from "../ui";
import { useApiClient } from "../../hooks/useApiClient";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

type ActivityTabsProps = {
  mode: "daily" | "monthly";
  date?: Date;
  month?: Date;
  changeMode: (mode: "daily" | "monthly") => void;
  activities?: GetActivitiesResponse;
  dailyActivityLogs?: GetActivityLogsResponse;
  monthlyActivityLogs?: GetActivityLogsResponse;
};

export const ActivityTabs: React.FC<ActivityTabsProps> = ({
  mode,
  date,
  month,
  changeMode,
  activities,
  dailyActivityLogs,
  monthlyActivityLogs,
}) => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreateActivityButtonClick = async (activityId: string) => {
    const utcDate = dayjs(date).toDate();

    if (!date) {
      return toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
    }
    const res = await api.users.activities[":id"].logs.$post({
      param: {
        id: activityId,
      },
      json: {
        date: utcDate,
      },
    });
    if (res.status !== 200) {
      toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
      return;
    }
    const json = await res.json();
    const parsedJson = GetActivityLogResponseSchema.safeParse(json);
    queryClient.setQueryData(
      ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      }
    );
    queryClient.setQueryData(
      ["activity-logs-monthly", dayjs(date).format("YYYY-MM")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      }
    );
  };

  const transformedMonthlyActivityLogs = monthlyActivityLogs
    ?.reduce(
      (acc, log) => {
        const logDate = dayjs(log.date).format("YYYY-MM-DD");
        const existingDate = acc.find((item) => item.date === logDate);
        if (existingDate) {
          existingDate.activities.push(log);
        } else {
          acc.push({ date: logDate, activities: [log] });
        }
        return acc;
      },
      [] as { date: string; activities: GetActivityLogsResponse }[]
    )
    .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());

  return (
    <Tabs defaultValue={mode} value={mode}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="daily" onClick={() => changeMode("daily")}>
          Daily
        </TabsTrigger>
        <TabsTrigger value="monthly" onClick={() => changeMode("monthly")}>
          Monthly
        </TabsTrigger>
      </TabsList>
      <TabsContent value="daily">
        <Card>
          <CardHeader>
            <CardTitle>{dayjs(date).format("YYYY-MM-DD")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-5">
              {activities?.map((activity) => (
                <Button
                  key={activity.id}
                  onClick={() => handleCreateActivityButtonClick(activity.id)}
                >
                  {activity.name}
                </Button>
              ))}
            </div>
            <hr />
            {dailyActivityLogs?.map((log) => (
              <div key={log.id} className="space-y-1">
                <p>
                  {log.activity.name}{" "}
                  {log.quantity &&
                    `${log.quantity} ${log.activity.quantityLabel}`}
                </p>
              </div>
            ))}
          </CardContent>
          <CardFooter></CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="monthly">
        <Card>
          <CardHeader>
            <CardTitle>{dayjs(month).format("YYYY-MM")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transformedMonthlyActivityLogs?.map((log) => (
              <div key={log.date} className="space-y-1">
                <p>{log.date} : </p>
                <ul>
                  {log.activities.map((activityLog) => (
                    <li key={activityLog.id}>
                      {activityLog.activity.name}{" "}
                      {activityLog.quantity &&
                        `${activityLog.quantity} ${activityLog.activity.quantityLabel}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
          <CardFooter></CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
