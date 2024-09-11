import dayjs from "dayjs";

import { GetActivitiesResponse } from "@/types/response/GetActivitiesResponse";
import { GetActivityLogsResponse } from "@/types/response/GetActivityLogsResponse";
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
} from "../ui";
import { ActivityDaily } from "./ActivityDaily";

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
        <ActivityDaily
          activities={activities}
          dailyActivityLogs={dailyActivityLogs}
          date={date}
        />
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
