import dayjs from "dayjs";

import type { GetActivityStatsResponse } from "@dtos/response";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui";



type ActivityStatsProps = {
  activityStats?: GetActivityStatsResponse;
  month?: Date;
};

export const ActivityStats: React.FC<ActivityStatsProps> = ({
  activityStats,
  month,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dayjs(month).format("YYYY-MM")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        {activityStats?.map((s) => (
          <Card key={s.id}>
            <CardHeader className="spacing-y-0 p-3">
              <CardTitle className="text-xl">
                {s.name} [{s.total} {s.quantityUnit}]
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
                      Total: {k.total} {s.quantityUnit}
                    </p>
                    <ul>
                      {k.logs.map((l, i) => (
                        <li key={`${i}-${l.date}`}>
                          {dayjs(l.date).format("YYYY-MM-DD")}: {l.quantity}{" "}
                          {s.quantityUnit}
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
      <CardFooter />
    </Card>
  );
};
