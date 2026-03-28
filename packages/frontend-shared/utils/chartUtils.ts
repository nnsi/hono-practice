import type { ChartData, GoalLine } from "../types/stats";

type DataKey = { name: string; color: string };

export function formatTickValue(v: number): string {
  return v.toLocaleString();
}

export function generateYTicks(
  yMax: number,
  count = 4,
  integerOnly = false,
): number[] {
  if (yMax === 0) return [0];
  const rawStep = yMax / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  let niceStep: number;
  if (normalized <= 1) niceStep = 1;
  else if (normalized <= 2) niceStep = 2;
  else if (normalized <= 5) niceStep = 5;
  else niceStep = 10;
  niceStep *= magnitude;

  if (integerOnly) {
    niceStep = Math.max(1, Math.ceil(niceStep));
  }

  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += niceStep) {
    ticks.push(Math.round(v * 100) / 100);
  }
  if (ticks[ticks.length - 1] < yMax) {
    ticks.push(Math.round((ticks[ticks.length - 1] + niceStep) * 100) / 100);
  }
  return ticks;
}

const TOP_PADDING_RATIO = 1.08;

export function computeChartScale(
  data: ChartData[],
  dataKeys: DataKey[],
  goalLines: GoalLine[],
  stacked: boolean,
): {
  yMax: number;
  allIntegers: boolean;
  yTicks: number[];
  effectiveYMax: number;
} {
  let max = 0;
  let allIntegers = true;

  if (stacked) {
    for (const d of data) {
      let sum = 0;
      for (const key of dataKeys) {
        const v = d.values[key.name] || 0;
        sum += v;
        if (allIntegers && v !== 0 && !Number.isInteger(v)) allIntegers = false;
      }
      max = Math.max(max, sum);
    }
  } else {
    for (const d of data) {
      for (const key of dataKeys) {
        const v = d.values[key.name] || 0;
        max = Math.max(max, v);
        if (allIntegers && v !== 0 && !Number.isInteger(v)) allIntegers = false;
      }
    }
  }
  for (const goal of goalLines) {
    max = Math.max(max, goal.value);
  }

  const yMax = max === 0 ? 10 : max;
  const yTicks = generateYTicks(yMax, 4, allIntegers);
  const topTick = yTicks[yTicks.length - 1] || yMax;
  const effectiveYMax = topTick * TOP_PADDING_RATIO;

  return { yMax, allIntegers, yTicks, effectiveYMax };
}

export function computeYAxisWidth(yTicks: number[]): number {
  const maxLabel = formatTickValue(yTicks[yTicks.length - 1] || 0);
  return Math.max(32, maxLabel.length * 7 + 8);
}

export function computeXLabelStep(
  dataLength: number,
  chartWidth: number,
  yAxisWidth: number,
  labelWidth = 32,
): number {
  if (dataLength === 0 || chartWidth === 0) return 1;
  const available = chartWidth - yAxisWidth - 24;
  const maxLabels = Math.max(2, Math.floor(available / labelWidth));
  return Math.max(1, Math.ceil(dataLength / maxLabels));
}

export function shouldShowXLabel(
  index: number,
  dataLength: number,
  tickStep: number,
): boolean {
  if (index === 0 || index === dataLength - 1) return true;
  return index % tickStep === 0 && dataLength - 1 - index >= tickStep;
}

export function tickBottomPct(tick: number, effectiveYMax: number): number {
  return (tick / effectiveYMax) * 100;
}

export function barHeightPct(value: number, effectiveYMax: number): number {
  return (value / effectiveYMax) * 100;
}

export function stackedTotal(d: ChartData, dataKeys: DataKey[]): number {
  return dataKeys.reduce((sum, key) => sum + (d.values[key.name] || 0), 0);
}
