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
} from "@components/ui";

import { ActivityDaily } from "./ActivityDaily";

type ActivityTabsProps = {
  mode: "daily" | "statistics";
  date?: Date;
  month?: Date;
  changeMode: (mode: "daily" | "statistics") => void;
  activities?: GetActivitiesResponse;
  dailyActivityLogs?: GetActivityLogsResponse;
  monthlyActivityLogs?: GetActivityLogsResponse;
};

type Stats = {
  id: string;
  name: string;
  quantityLabel: string;
  total: number;
  kinds: {
    id: string | null;
    name: string;
    total: number;
    logs: {
      date: string | Date;
      quantity: number;
    }[];
  }[];
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
  const stats =
    monthlyActivityLogs?.reduce((acc, log) => {
      const activity = log.activity;
      const kind = log.activityKind;

      const targetIndex = acc.findIndex((s) => s.id === activity.id);
      if (targetIndex === -1) {
        acc.push({
          id: activity.id,
          name: activity.name,
          quantityLabel: activity.quantityLabel,
          total: log.quantity ?? 0,
          kinds: [],
        });
      } else {
        acc[targetIndex].total += log.quantity ?? 0;
      }

      const target = acc[targetIndex !== -1 ? targetIndex : acc.length - 1];
      const kid = kind ? kind.id : null;
      const kindIndex = target.kinds.findIndex((k) => k.id === kid);
      if (kindIndex === -1) {
        target.kinds.push({
          id: kid,
          name: kind ? kind.name : "未指定",
          total: log.quantity ?? 0,
          logs: [
            {
              date: log.date,
              quantity: log.quantity ?? 0,
            },
          ],
        });
      } else {
        target.kinds[kindIndex].total += log.quantity ?? 0;
        target.kinds[kindIndex].logs.push({
          date: log.date,
          quantity: log.quantity ?? 0,
        });
      }

      return acc;
    }, [] as Stats[]) ?? [];
  console.log(stats);

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
            {stats.map((s) => (
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
