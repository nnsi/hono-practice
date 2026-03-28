/**
 * APMデータプロバイダーの抽象型。
 * 実装を差し替えることでWAE, OpenTelemetry, Datadog等に対応可能。
 */
export type ApmSummary = {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  avgResponseTimeMs: number;
};

export type ApmProvider = {
  getSummary: () => Promise<ApmSummary>;
};

/** 開発環境用モックプロバイダー（リアルなダミーデータを返す） */
export function createMockApmProvider(): ApmProvider {
  return {
    getSummary: async () => ({
      totalRequests: 1247,
      errorCount: 3,
      errorRate: 0.24,
      avgResponseTimeMs: 42.8,
    }),
  };
}

/** データなしプロバイダー（WAEトークン未設定時） */
export function getNullApmProvider(): ApmProvider {
  return {
    getSummary: async () => ({
      totalRequests: 0,
      errorCount: 0,
      errorRate: 0,
      avgResponseTimeMs: 0,
    }),
  };
}
