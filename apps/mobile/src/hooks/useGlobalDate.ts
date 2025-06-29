import { useCallback, useMemo, useState } from "react";

export const useGlobalDate = () => {
  const [date, setDate] = useState<Date>(new Date());

  const dateString = useMemo(() => date.toISOString().split("T")[0], [date]);

  const setDateFromString = useCallback((dateStr: string) => {
    setDate(new Date(dateStr));
  }, []);

  return {
    date,
    dateString,
    setDate,
    setDateFromString,
  };
};
