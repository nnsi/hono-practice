import { z } from "zod";

import type { RecordingMode } from "./recordingMode";

const CounterConfigSchema = z.object({
  mode: z.literal("counter"),
  steps: z.array(z.number().positive()).min(1),
});

const BinaryConfigSchema = z.object({
  mode: z.literal("binary"),
  labels: z.tuple([z.string(), z.string()]),
});

export const RecordingModeConfigSchema = z.discriminatedUnion("mode", [
  CounterConfigSchema,
  BinaryConfigSchema,
]);

export type RecordingModeConfig = z.infer<typeof RecordingModeConfigSchema>;

export function parseRecordingModeConfig(
  raw: string | null,
): RecordingModeConfig | null {
  if (!raw) return null;
  try {
    const parsed = RecordingModeConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function serializeRecordingModeConfig(
  config: RecordingModeConfig | null,
): string | null {
  return config ? JSON.stringify(config) : null;
}

export function defaultRecordingModeConfig(
  mode: RecordingMode,
): RecordingModeConfig | null {
  switch (mode) {
    case "counter":
      return { mode: "counter", steps: [1, 10, 100] };
    case "binary":
      return { mode: "binary", labels: ["A", "B"] };
    default:
      return null;
  }
}
