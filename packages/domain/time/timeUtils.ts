export type TimeUnitType = "hour" | "minute" | "second" | null;

export const isTimeUnit = (unit: string | null | undefined): boolean => {
  if (!unit) return false;
  const timeUnits = ["時", "分", "秒", "hour", "min", "sec", "時間"];
  return timeUnits.some((u) => unit.toLowerCase().includes(u));
};

export const getTimeUnitType = (
  unit: string | null | undefined,
): TimeUnitType => {
  if (!unit) return null;
  const lowerUnit = unit.toLowerCase();
  if (lowerUnit.includes("時") || lowerUnit.includes("hour")) return "hour";
  if (lowerUnit.includes("分") || lowerUnit.includes("min")) return "minute";
  if (lowerUnit.includes("秒") || lowerUnit.includes("sec")) return "second";
  return null;
};

export const convertSecondsToUnit = (
  seconds: number,
  unitType: TimeUnitType,
): number => {
  switch (unitType) {
    case "hour":
      return Math.round((seconds / 3600) * 100) / 100;
    case "minute":
      return Math.round((seconds / 60) * 10) / 10;
    case "second":
      return seconds;
    default:
      return seconds;
  }
};

export const generateTimeMemo = (startTime: Date, endTime: Date): string => {
  const fmt = (d: Date) => {
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };
  return `${fmt(startTime)} - ${fmt(endTime)}`;
};

export const formatElapsedTime = (elapsedMs: number): string => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
};
