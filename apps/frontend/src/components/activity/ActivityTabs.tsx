import type { GetActivityLogsResponse } from "@dtos/response";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui";

import { ActivityDaily, ActivityStats } from ".";

type ActivityTabsProps = {
  mode: "daily" | "statistics";
  date?: Date;
  month?: Date;
  changeMode: (mode: "daily" | "statistics") => void;
  dailyActivityLogs?: GetActivityLogsResponse;
};

export const ActivityTabs: React.FC<ActivityTabsProps> = ({
  mode,
  date,
  month,
  changeMode,
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
        <ActivityDaily date={date} />
      </TabsContent>
      <TabsContent value="statistics">
        <ActivityStats month={month} />
      </TabsContent>
    </Tabs>
  );
};
