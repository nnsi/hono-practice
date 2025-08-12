import { useCallback, useContext, useEffect } from "react";

import { createEventBusAdapter } from "@frontend/adapters/EventBusAdapter";
import { DateContext } from "@frontend/providers/DateProvider";
import { useEventBus } from "@frontend/providers/EventBusProvider";

export const useGlobalDate = () => {
  const { date: selectedDate, setDate: setSelectedDateState } =
    useContext(DateContext);
  const eventBus = useEventBus();
  const eventBusAdapter = createEventBusAdapter(eventBus);

  // Sync date changes through event bus
  useEffect(() => {
    const handleDateChange = (data: unknown) => {
      if (data && typeof data === "object" && "date" in data) {
        const dateValue = (data as { date: string | Date }).date;
        const newDate =
          typeof dateValue === "string" ? new Date(dateValue) : dateValue;
        if (!Number.isNaN(newDate.getTime())) {
          setSelectedDateState(newDate);
        }
      }
    };

    const unsubscribe = eventBusAdapter.on(
      "globalDate:changed",
      handleDateChange,
    );
    return unsubscribe;
  }, [eventBusAdapter, setSelectedDateState]);

  const setSelectedDate = useCallback(
    (date: Date) => {
      setSelectedDateState(date);
      eventBusAdapter.emit("globalDate:changed", { date: date.toISOString() });
    },
    [eventBusAdapter, setSelectedDateState],
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
  }, [setSelectedDate]);

  const goToPreviousDay = useCallback(() => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  }, [selectedDate, setSelectedDate]);

  const goToNextDay = useCallback(() => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  }, [selectedDate, setSelectedDate]);

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }, []);

  const formatDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];

    return `${year}/${month}/${day} (${weekday})`;
  }, []);

  return {
    selectedDate,
    setSelectedDate,
    goToToday,
    goToPreviousDay,
    goToNextDay,
    isToday,
    formatDate,
  };
};
