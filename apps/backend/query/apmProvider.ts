/**
 * APMデータプロバイダーの抽象型。
 * 実装を差し替えることでWAE, OpenTelemetry, Datadog等に対応可能。
 */
export type ApmSummary = {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  badRequestCount: number;
  avgResponseTimeMs: number;
};

export type ApiErrorDetail = {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  error: string;
  durationMs: number;
};

export type ApmProvider = {
  getSummary: () => Promise<ApmSummary>;
  getErrorDetails: (kind: "5xx" | "400") => Promise<ApiErrorDetail[]>;
};

/** 開発環境用モックプロバイダー（リアルなダ��ーデータを返す） */
export function newMockApmProvider(): ApmProvider {
  return {
    getSummary: async () => ({
      totalRequests: 1247,
      errorCount: 3,
      errorRate: 0.24,
      badRequestCount: 5,
      avgResponseTimeMs: 42.8,
    }),
    getErrorDetails: async () => [
      {
        timestamp: new Date().toISOString(),
        method: "POST",
        path: "/users/v2/sync/activities",
        status: 500,
        error: "Mock internal server error",
        durationMs: 120,
      },
    ],
  };
}

/** データなしプロバイダー��WAEトークン未設定時��� */
export function newNullApmProvider(): ApmProvider {
  return {
    getSummary: async () => ({
      totalRequests: 0,
      errorCount: 0,
      errorRate: 0,
      badRequestCount: 0,
      avgResponseTimeMs: 0,
    }),
    getErrorDetails: async () => [],
  };
}
