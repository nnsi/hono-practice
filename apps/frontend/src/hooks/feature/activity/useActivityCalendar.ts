import { createUseActivityCalendar } from "@packages/frontend-shared/hooks/feature";

export const useActivityCalendar = (
  date: Date,
  setDate: (date: Date) => void,
) => {
  return createUseActivityCalendar(date, setDate);
};
