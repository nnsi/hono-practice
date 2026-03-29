import type {
  ApiErrorDetail,
  ApmProvider,
  ApmSummary,
} from "@backend/query/apmProvider";

const QUERY_24H = `
SELECT
  count() as total_requests,
  countIf(double1 >= 500) as error_count,
  if(count() > 0, countIf(double1 >= 500) / count() * 100, 0) as error_rate,
  countIf(double1 = 400) as bad_request_count,
  avg(double2) as avg_response_time
FROM actiko_api_logs
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob4 <> 'OPTIONS'
`.trim();

type WaeSummaryResponse = {
  data: Array<{
    total_requests: string;
    error_count: string;
    error_rate: string;
    bad_request_count: string;
    avg_response_time: string;
  }>;
};

type WaeErrorDetailResponse = {
  data: Array<{
    timestamp: string;
    method: string;
    path: string;
    status: string;
    error: string;
    duration: string;
  }>;
};

function buildErrorDetailQuery(kind: "5xx" | "400"): string {
  const condition = kind === "5xx" ? "double1 >= 500" : "double1 = 400";
  return `
SELECT
  timestamp,
  blob4 as method,
  blob5 as path,
  double1 as status,
  blob7 as error,
  double2 as duration
FROM actiko_api_logs
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob4 <> 'OPTIONS'
  AND ${condition}
ORDER BY timestamp DESC
LIMIT 50
  `.trim();
}

const EMPTY_APM: ApmSummary = {
  totalRequests: 0,
  errorCount: 0,
  errorRate: 0,
  badRequestCount: 0,
  avgResponseTimeMs: 0,
};

export function newWaeApmProvider(
  cfApiToken: string,
  cfAccountId: string,
): ApmProvider {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`;

  return {
    getSummary: async (): Promise<ApmSummary> => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "text/plain",
          },
          body: QUERY_24H,
        });

        if (!res.ok) {
          console.error(`WAE query failed: ${res.status}`);
          return EMPTY_APM;
        }

        const json: WaeSummaryResponse = await res.json();
        const row = json.data?.[0];
        if (!row) return EMPTY_APM;

        return {
          totalRequests: Number(row.total_requests) || 0,
          errorCount: Number(row.error_count) || 0,
          errorRate: Math.round((Number(row.error_rate) || 0) * 100) / 100,
          badRequestCount: Number(row.bad_request_count) || 0,
          avgResponseTimeMs:
            Math.round((Number(row.avg_response_time) || 0) * 100) / 100,
        };
      } catch (e) {
        console.error("WAE query error:", e);
        return EMPTY_APM;
      }
    },

    getErrorDetails: async (kind): Promise<ApiErrorDetail[]> => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "text/plain",
          },
          body: buildErrorDetailQuery(kind),
        });

        if (!res.ok) {
          console.error(`WAE error detail query failed: ${res.status}`);
          return [];
        }

        const json: WaeErrorDetailResponse = await res.json();
        if (!json.data) return [];

        return json.data.map((row) => ({
          timestamp: row.timestamp,
          method: row.method,
          path: row.path,
          status: Number(row.status) || 0,
          error: row.error,
          durationMs: Math.round((Number(row.duration) || 0) * 100) / 100,
        }));
      } catch (e) {
        console.error("WAE error detail query error:", e);
        return [];
      }
    },
  };
}
