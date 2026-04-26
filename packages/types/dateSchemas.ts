import { z } from "zod";

export const dateStringSchema = z.iso.date();

export const dateOrMonthStringSchema = z.union([
  dateStringSchema,
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
]);

export function addDateRangeIssue(
  ctx: z.RefinementCtx,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  path: string,
  message: string,
) {
  if (startDate != null && endDate != null && endDate < startDate) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message,
    });
  }
}

export function addEndDateRangeIssue(
  ctx: z.RefinementCtx,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  addDateRangeIssue(
    ctx,
    startDate,
    endDate,
    "endDate",
    "validation:endDateBeforeStartDate",
  );
}
