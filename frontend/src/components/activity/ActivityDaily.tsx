import dayjs from "dayjs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui";
import { ActivityLogCreateForm } from "./ActivityLogCreateForm";
import { GetActivitiesResponse } from "@/types/response/GetActivitiesResponse";
import { GetActivityLogsResponse } from "@/types/response/GetActivityLogsResponse";

type ActivityDailyProps = {
  activities?: GetActivitiesResponse;
  dailyActivityLogs?: GetActivityLogsResponse;
  date?: Date;
};

export const ActivityDaily: React.FC<ActivityDailyProps> = ({
  activities,
  dailyActivityLogs,
  date,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dayjs(date).format("YYYY-MM-DD")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-5">
          {activities?.map((activity) => (
            <ActivityLogCreateForm
              key={activity.id}
              activity={activity}
              date={date}
            />
          ))}
        </div>
        <hr />
        {dailyActivityLogs?.map((log) => (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{log.activity.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {log.quantity} {log.activity.quantityLabel}
            </CardContent>
          </Card>
        ))}
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
  );
};
