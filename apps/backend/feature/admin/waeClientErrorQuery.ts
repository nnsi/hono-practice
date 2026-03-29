import type {
  ClientErrorDetail,
  ClientErrorProvider,
  ClientErrorSummary,
} from "@backend/query/clientErrorProvider";
import { EMPTY_CLIENT_ERROR_SUMMARY } from "@backend/query/clientErrorProvider";

const QUERY_SUMMARY_24H = `
SELECT
  blob6 as platform,
  count() as cnt
FROM actiko_client_errors
WHERE timestamp > NOW() - INTERVAL '24' HOUR
GROUP BY blob6
ORDER BY cnt DESC
`.trim();

function buildDetailQuery(platform: string): string {
  return `
SELECT
  timestamp,
  blob1 as error_type,
  blob2 as message,
  blob5 as screen,
  blob6 as platform
FROM actiko_client_errors
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob6 = '${platform}'
ORDER BY timestamp DESC
LIMIT 50
  `.trim();
}

type WaeSummaryResponse = {
  data: Array<{
    platform: string;
    cnt: string;
  }>;
};

type WaeDetailResponse = {
  data: Array<{
    timestamp: string;
    error_type: string;
    message: string;
    screen: string;
    platform: string;
  }>;
};

export function newWaeClientErrorProvider(
  cfApiToken: string,
  cfAccountId: string,
): ClientErrorProvider {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`;

  async function query<T>(sql: string): Promise<T | null> {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "text/plain",
        },
        body: sql,
      });

      if (!res.ok) {
        console.error(`WAE client error query failed: ${res.status}`);
        return null;
      }

      return res.json() as Promise<T>;
    } catch (e) {
      console.error("WAE client error query error:", e);
      return null;
    }
  }

  return {
    getSummary: async (): Promise<ClientErrorSummary> => {
      const json = await query<WaeSummaryResponse>(QUERY_SUMMARY_24H);
      if (!json?.data) return EMPTY_CLIENT_ERROR_SUMMARY;

      const result: ClientErrorSummary = { web: 0, ios: 0, android: 0 };
      for (const row of json.data) {
        const p = row.platform as keyof ClientErrorSummary;
        if (p in result) {
          result[p] = Number(row.cnt) || 0;
        }
      }
      return result;
    },

    getDetails: async (platform: string): Promise<ClientErrorDetail[]> => {
      const allowed = ["web", "ios", "android"];
      if (!allowed.includes(platform)) return [];

      const json = await query<WaeDetailResponse>(buildDetailQuery(platform));
      if (!json?.data) return [];

      return json.data.map((row) => ({
        timestamp: row.timestamp,
        errorType: row.error_type,
        message: row.message,
        platform: row.platform,
        screen: row.screen,
      }));
    },
  };
}
