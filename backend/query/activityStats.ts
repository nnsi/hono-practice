import { sql } from "drizzle-orm";

import { GetActivityStatsResponse } from "@/types/response/GetActivityStatsResponse";

import { drizzle } from "../lib/drizzle";

export async function activityStatsQuery(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const result = await drizzle.execute<GetActivityStatsResponse>(sql`
SELECT
  a.id as activity_id,
  ak.id as activity_kind_id,
  a.name as activity_name,
  COALESCE(ak.name, '未指定') AS kind_name,
  sum(al.quantity) as total_quantity,
  json_agg(json_build_object(
    'date', al.date,
    'quantity', al.quantity
  )) AS logs
FROM
  activity_log as al
INNER JOIN
  activity as a on a.id = al.activity_id
LEFT JOIN
  activity_kind as ak on ak.id = al.activity_kind_id
WHERE
  al.deleted_at IS NULL
  AND a.user_id = ${userId}
  AND al.date >= ${startDate}
  AND al.date <= ${endDate}
GROUP BY
    a.id,ak.id,a.name,ak.name,a.order_index
ORDER BY
  a.order_index asc,ak.order_index asc
;`);

  return result;
}