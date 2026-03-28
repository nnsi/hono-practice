import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";

import type { TracerSummary } from "../lib/tracer";

/** スタックトレースの最初のフレーム（"at ..."行）を取得 */
export const firstStackFrame = (stack?: string): string => {
  if (!stack) return "";
  const line = stack.split("\n").find((l) => l.trimStart().startsWith("at "));
  return line?.trim() ?? "";
};

export type WAEEntry = {
  level: string;
  requestId: string;
  method: string;
  path: string;
  feature?: string;
  error?: string;
  stackFrame?: string;
  status: number;
  duration: number;
  summary: TracerSummary;
};

/** WAEに書き込むデータポイントを生成 */
export const writeToWAE = (wae: AnalyticsEngineDataset, entry: WAEEntry) => {
  wae.writeDataPoint({
    blobs: [
      entry.level,
      "Response sent",
      entry.requestId,
      entry.method,
      entry.path,
      entry.feature ?? "",
      entry.error ?? "",
      entry.stackFrame ?? "",
    ],
    doubles: [
      entry.status,
      entry.duration,
      entry.summary.dbMs,
      entry.summary.r2Ms,
      entry.summary.kvMs,
      entry.summary.extMs,
      entry.summary.spanCount,
    ],
    indexes: [entry.level],
  });
};
