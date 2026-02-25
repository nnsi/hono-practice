import { z } from "zod";
import { DomainValidateError } from "../errors";

// Input validation schema (for API input)
export const ActivityLogInputSchema = z.object({
  quantity: z.number().min(0).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().default(""),
});

// Date validation (separated from entity factory, now parameterized)
export function validateActivityLogDate(
  date: string,
  now: Date = new Date(),
): void {
  const d = new Date(date);
  const tenYearsAgo = new Date(now);
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  if (d < tenYearsAgo) {
    throw new DomainValidateError(
      "date is too old (more than 10 years ago)",
    );
  }
}
