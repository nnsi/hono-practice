export type { WeekDay, WeekEntry } from "./buildWeeks";
export { buildWeeks } from "./buildWeeks";
export {
  barHeightPct,
  computeChartScale,
  computeXLabelStep,
  computeYAxisWidth,
  formatTickValue,
  generateYTicks,
  shouldShowXLabel,
  stackedTotal,
  tickBottomPct,
} from "./chartUtils";
export {
  COLOR_PALETTE,
  DEFAULT_BAR_COLOR,
  getUniqueColorForKind,
} from "./colorUtils";
export {
  addDays,
  addMonths,
  daysInMonth,
  getEndOfMonth,
  getStartOfMonth,
  getToday,
  isToday,
} from "./dateUtils";
export { emitDebtFeedback, onDebtFeedback } from "./debtFeedbackEvents";
export type {
  ErrorContext,
  ErrorReport,
  ReportErrorOptions,
} from "./errorReporter";
export { reportError } from "./errorReporter";
export { setupGlobalErrorHandler } from "./globalErrorHandler";
export { generateGoalLines } from "./goalLineGeneration";
export { formatQuantityWithUnit, roundQuantity } from "./statsFormatting";
export { groupTasksByTimeline } from "./taskGrouping";
