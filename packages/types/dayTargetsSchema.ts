import { z } from "zod";

export const dayTargetsRequestSchema = z.partialRecord(
  z.enum(["1", "2", "3", "4", "5", "6", "7"]),
  z.number().nonnegative(),
);
