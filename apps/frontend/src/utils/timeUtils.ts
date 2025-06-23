// 時間単位の判定
export const isTimeUnit = (unit: string | null | undefined): boolean => {
  if (!unit) return false;
  const timeUnits = ["時", "分", "秒", "hour", "min", "sec", "時間"];
  return timeUnits.some((u) => unit.toLowerCase().includes(u));
};

// 時間単位の種別を取得
export type TimeUnitType = "hour" | "minute" | "second" | null;

export const getTimeUnitType = (unit: string | null | undefined): TimeUnitType => {
  if (!unit) return null;
  const lowerUnit = unit.toLowerCase();
  
  if (lowerUnit.includes("時") || lowerUnit.includes("hour")) {
    return "hour";
  }
  if (lowerUnit.includes("分") || lowerUnit.includes("min")) {
    return "minute";
  }
  if (lowerUnit.includes("秒") || lowerUnit.includes("sec")) {
    return "second";
  }
  return null;
};

// 秒数を指定された単位に変換
export const convertSecondsToUnit = (seconds: number, unitType: TimeUnitType): number => {
  switch (unitType) {
    case "hour":
      return Math.round((seconds / 3600) * 100) / 100; // 小数点2桁まで
    case "minute":
      return Math.round((seconds / 60) * 10) / 10; // 小数点1桁まで
    case "second":
      return seconds;
    default:
      return seconds;
  }
};

// 開始・終了時刻のメモを生成
export const generateTimeMemo = (startTime: Date, endTime: Date): string => {
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};