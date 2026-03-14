import dayjs from "dayjs";

/** ISO weekday: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun */
export type DayTargets = Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number>>;

type DayKey = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const DAY_KEY_MAP: Record<string, DayKey> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
};

/** unknown値を DayTargets | null に安全にパースする */
export function parseDayTargets(v: unknown): DayTargets | null {
  if (v == null) return null;
  let obj: Record<string, unknown>;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      )
        return null;
      obj = parsed;
    } catch {
      return null;
    }
  } else if (typeof v === "object" && !Array.isArray(v)) {
    obj = v as Record<string, unknown>;
  } else {
    return null;
  }
  const result: DayTargets = {};
  let hasAny = false;
  for (const [k, val] of Object.entries(obj)) {
    const dayKey = DAY_KEY_MAP[k];
    if (dayKey === undefined) continue;
    if (typeof val === "number" && Number.isFinite(val) && val >= 0) {
      result[dayKey] = val;
      hasAny = true;
    }
  }
  return hasAny ? result : null;
}

/** フォーム入力用の文字列 Record から DayTargets を構築する */
export function buildDayTargets(
  values: Record<string, string>,
): DayTargets | null {
  const result: DayTargets = {};
  let hasAny = false;
  for (const [sk, dayKey] of Object.entries(DAY_KEY_MAP)) {
    const v = values[sk];
    if (v !== undefined && v !== "") {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) {
        result[dayKey] = n;
        hasAny = true;
      }
    }
  }
  return hasAny ? result : null;
}

/**
 * 指定日の目標値を返す。
 * dayTargets 未設定なら dailyTargetQuantity をそのまま返す。
 * dayTargets に該当曜日がなければ dailyTargetQuantity をフォールバックとして使う。
 */
export function getDailyTargetForDate(
  dailyTargetQuantity: number,
  dayTargets: DayTargets | null | undefined,
  date: string,
): number {
  if (!dayTargets) return dailyTargetQuantity;
  // dayjs().day(): 0=Sun, 1=Mon, ..., 6=Sat → ISO weekday: 1=Mon, ..., 7=Sun
  const isoWeekday = (dayjs(date).day() || 7) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  return dayTargets[isoWeekday] ?? dailyTargetQuantity;
}
