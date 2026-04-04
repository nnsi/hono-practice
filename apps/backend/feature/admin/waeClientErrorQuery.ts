import type {
  ClientErrorDetail,
  ClientErrorProvider,
  ClientErrorSummary,
} from "@backend/query/clientErrorProvider";
import { EMPTY_CLIENT_ERROR_SUMMARY } from "@backend/query/clientErrorProvider";
import { z } from "zod";

const QUERY_SUMMARY_24H = `
SELECT
  blob6 as platform,
  count() as cnt
FROM actiko_client_errors
WHERE timestamp > NOW() - INTERVAL '24' HOUR
GROUP BY blob6
ORDER BY cnt DESC
`.trim();

const ALLOWED_PLATFORMS = ["web", "ios", "android"] as const;

function buildDetailQuery(platform: string): string {
  if (!(ALLOWED_PLATFORMS as readonly string[]).includes(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }
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

const waeSummaryResponseSchema = z.object({
  data: z.array(z.object({ platform: z.string(), cnt: z.string() })),
});

const waeDetailResponseSchema = z.object({
  data: z.array(
    z.object({
      timestamp: z.string(),
      error_type: z.string(),
      message: z.string(),
      screen: z.string(),
      platform: z.string(),
    }),
  ),
});

export function newWaeClientErrorProvider(
  cfApiToken: string,
  cfAccountId: string,
): ClientErrorProvider {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`;

  async function query(sql: string): Promise<unknown> {
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

      return res.json();
    } catch (e) {
      console.error("WAE client error query error:", e);
      return null;
    }
  }

  return {
    getSummary: async (): Promise<ClientErrorSummary> => {
      const raw = await query(QUERY_SUMMARY_24H);
      const parsed = waeSummaryResponseSchema.safeParse(raw);
      if (!parsed.success) return EMPTY_CLIENT_ERROR_SUMMARY;

      const result: ClientErrorSummary = { web: 0, ios: 0, android: 0 };
      for (const row of parsed.data.data) {
        switch (row.platform) {
          case "web":
          case "ios":
          case "android":
            result[row.platform] = Number(row.cnt) || 0;
            break;
        }
      }
      return result;
    },

    getDetails: async (platform: string): Promise<ClientErrorDetail[]> => {
      if (!(ALLOWED_PLATFORMS as readonly string[]).includes(platform))
        return [];

      const raw = await query(buildDetailQuery(platform));
      const parsed = waeDetailResponseSchema.safeParse(raw);
      if (!parsed.success) return [];

      return parsed.data.data.map((row) => ({
        timestamp: row.timestamp,
        errorType: row.error_type,
        message: row.message,
        platform: row.platform,
        screen: row.screen,
      }));
    },
  };
}
