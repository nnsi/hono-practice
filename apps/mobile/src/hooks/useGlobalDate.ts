import { useCallback, useMemo } from "react";

import { useGlobalDateContext } from "../providers/GlobalDateProvider";

export const useGlobalDate = () => {
  const { date, setDate } = useGlobalDateContext();

  const dateString = useMemo(() => date.toISOString().split("T")[0], [date]);

  const setDateFromString = useCallback(
    (dateStr: string) => {
      setDate(new Date(dateStr));
    },
    [setDate],
  );

  return {
    date,
    dateString,
    setDate,
    setDateFromString,
  };
};
