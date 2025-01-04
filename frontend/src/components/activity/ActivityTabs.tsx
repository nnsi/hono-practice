import type { GetActivityStatsResponse } from "@/types/response";
import type { GetActivitiesResponse } from "@/types/response/GetActivitiesResponse";
import type { GetActivityLogsResponse } from "@/types/response/GetActivityLogsResponse";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui";

import { ActivityDaily, ActivityStats } from ".";

type ActivityTabsProps = {
  mode: "daily" | "statistics";
  date?: Date;
  month?: Date;
  changeMode: (mode: "daily" | "statistics") => void;
  activities?: GetActivitiesResponse;
  dailyActivityLogs?: GetActivityLogsResponse;
  activityStats?: GetActivityStatsResponse;
};

export const ActivityTabs: React.FC<ActivityTabsProps> = ({
  mode,
  date,
  month,
  changeMode,
  activities,
  dailyActivityLogs,
  activityStats,
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
        <ActivityStats activityStats={activityStats} month={month} />
      </TabsContent>
    </Tabs>
  );
};
