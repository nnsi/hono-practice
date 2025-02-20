import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import type {
  GetActivitiesResponse,
  GetActivityStatsResponse,
} from "@dtos/response";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui";

type ActivityStatsProps = {
  month?: Date;
};

export const ActivityStats: React.FC<ActivityStatsProps> = ({ month }) => {
  if (!month) return <></>;

  const activityStats = useQuery<GetActivityStatsResponse>({
    queryKey: ["activity-stats-monthly", dayjs(month).format("YYYY-MM")],
    enabled: false,
  });

  const activities = useQuery<GetActivitiesResponse>({
    queryKey: ["activity"],
    enabled: false,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dayjs(month).format("YYYY-MM")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        {activityStats.data?.map((s) => (
          <Card key={s.id}>
            <CardHeader className="spacing-y-0 p-3">
              <CardTitle className="text-xl">
                {s.name} [{s.total} {s.quantityUnit}]
              </CardTitle>
            </CardHeader>
            {activities.data?.find(
              (a) => a.id === s.id && a.kinds.length > 0,
            ) ? (
              <CardContent className="grid gap-3">
                {s.kinds.map((k) => (
                  <div key={k.id}>
                    <h3 className="text-base font-bold">
                      {k.name} / {k.total} {s.quantityUnit}
                    </h3>
                    <ul>
                      {k.logs.map((l, i) => (
                        <li key={`${i}-${l.date}`}>
                          {dayjs(l.date).format("YYYY-MM-DD")}: {l.quantity}{" "}
                          {s.quantityUnit}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            ) : (
              <ul className="p-3 pl-5">
                {s.kinds[0].logs.map((l, i) => (
                  <li key={`${i}-${l.date}`}>
                    {dayjs(l.date).format("YYYY-MM-DD")}: {l.quantity}{" "}
                    {s.quantityUnit}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </CardContent>
      <CardFooter />
    </Card>
  );
};
