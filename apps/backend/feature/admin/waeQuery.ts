import type { ApmProvider, ApmSummary } from "./apmProvider";

const WAE_SQL_ENDPOINT =
  "https://api.cloudflare.com/client/v4/accounts/4cd610dc1501d4e5846588d422150e15/analytics_engine/sql";

const QUERY_24H = `
SELECT
  count() as total_requests,
  countIf(double1 >= 500) as error_count,
  if(count() > 0, countIf(double1 >= 500) / count() * 100, 0) as error_rate,
  avg(double2) as avg_response_time
FROM actiko_api_logs
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob4 <> 'OPTIONS'
`.trim();

type WaeResponse = {
  data: Array<{
    total_requests: string;
    error_count: string;
    error_rate: string;
    avg_response_time: string;
  }>;
};

export function createWaeApmProvider(cfApiToken: string): ApmProvider {
  return {
    getSummary: async (): Promise<ApmSummary> => {
      const res = await fetch(WAE_SQL_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "text/plain",
        },
        body: QUERY_24H,
      });

      if (!res.ok) {
        console.error(`WAE query failed: ${res.status}`);
        return {
          totalRequests: 0,
          errorCount: 0,
          errorRate: 0,
          avgResponseTimeMs: 0,
        };
      }

      const json: WaeResponse = await res.json();
      const row = json.data?.[0];
      if (!row) {
        return {
          totalRequests: 0,
          errorCount: 0,
          errorRate: 0,
          avgResponseTimeMs: 0,
        };
      }

      return {
        totalRequests: Number(row.total_requests) || 0,
        errorCount: Number(row.error_count) || 0,
        errorRate: Math.round((Number(row.error_rate) || 0) * 100) / 100,
        avgResponseTimeMs:
          Math.round((Number(row.avg_response_time) || 0) * 100) / 100,
      };
    },
  };
}
