export {
  COLOR_PALETTE,
  DEFAULT_BAR_COLOR,
  getUniqueColorForKind,
} from "./colorUtils";
export type { ErrorContext, ErrorReport, ReportErrorOptions } from "./errorReporter";
export { reportError } from "./errorReporter";
export { setupGlobalErrorHandler } from "./globalErrorHandler";
export { generateGoalLines } from "./goalLineGeneration";
export { formatQuantityWithUnit, roundQuantity } from "./statsFormatting";
