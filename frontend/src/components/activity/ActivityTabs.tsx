import dayjs from "dayjs";

import type { GetActivityStatsResponse } from "@/types/response";
import type { GetActivitiesResponse } from "@/types/response/GetActivitiesResponse";
import type { GetActivityLogsResponse } from "@/types/response/GetActivityLogsResponse";

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
} from "@components/ui";

import { ActivityDaily } from "./ActivityDaily";

type ActivityTabsProps = {
  mode: "daily" | "statistics";
  date?: Date;
  month?: Date;
  changeMode: (mode: "daily" | "statistics") => void;
  activities?: GetActivitiesResponse;
  dailyActivityLogs?: GetActivityLogsResponse;
  monthlyActivityLogs?: GetActivityStatsResponse;
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
  return (
    <Tabs defaultValue={mode} value={mode}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="daily" onClick={() => changeMode("daily")}>
          Daily
        </TabsTrigger>
        <TabsTrigger
          value="statistics"
          onClick={() => changeMode("statistics")}
        >
          Statistics
        </TabsTrigger>
      </TabsList>
      <TabsContent value="daily">
        <ActivityDaily
          activities={activities}
          dailyActivityLogs={dailyActivityLogs}
          date={date}
        />
      </TabsContent>
      <TabsContent value="statistics">
        <Card>
          <CardHeader>
            <CardTitle>{dayjs(month).format("YYYY-MM")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {monthlyActivityLogs?.map((s) => (
              <Card key={s.id}>
                <CardHeader className="spacing-y-0 p-3">
                  <CardTitle className="text-xl">
                    {s.name} [{s.total} {s.quantityLabel}]
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {s.kinds.map((k) => (
                    <Card key={k.id}>
                      <CardHeader>
                        <CardTitle>{k.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>
                          Total: {k.total} {s.quantityLabel}
                        </p>
                        <ul>
                          {k.logs.map((l, i) => (
                            <li key={i}>
                              {dayjs(l.date).format("YYYY-MM-DD")}: {l.quantity}{" "}
                              {s.quantityLabel}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            ))}
          </CardContent>
          <CardFooter></CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
