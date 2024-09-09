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

type ActivityTabsProps = {
  mode: "daily" | "monthly";
  changeMode: (mode: "daily" | "monthly") => void;
  activities?: GetActivitiesResponse;
  dailyActivityLogs?: GetActivityLogsResponse;
  monthlyActivityLogs?: GetActivityLogsResponse;
};

export const ActivityTabs: React.FC<ActivityTabsProps> = ({
  mode,
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
        <TabsTrigger value="monthly" onClick={() => changeMode("monthly")}>
          Monthly
        </TabsTrigger>
      </TabsList>
      <TabsContent value="daily">
        <Card>
          <CardHeader>
            <CardTitle>Daily Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activities?.map((activity) => (
              <div key={activity.id} className="space-y-1">
                <p>{activity.name}</p>
              </div>
            ))}
            <hr />
            {dailyActivityLogs?.map((log) => (
              <div key={log.id} className="space-y-1">
                <p>{log.activity.name}</p>
              </div>
            ))}
          </CardContent>
          <CardFooter></CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="monthly">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {monthlyActivityLogs?.map((log) => (
              <div key={log.id} className="space-y-1">
                <p>{log.activity.name}</p>
              </div>
            ))}
          </CardContent>
          <CardFooter></CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
