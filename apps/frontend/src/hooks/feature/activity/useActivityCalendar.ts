import { createUseActivityCalendar } from "@packages/frontend-shared/hooks/feature";

export const useActivityCalendar = (
  date: Date,
  setDate: (date: Date) => void,
) => {
  const { stateProps, actions } = createUseActivityCalendar(date, setDate);

  // 後方互換性を維持
  return {
    ...stateProps,
    // 旧API互換のアクション
    handleCalendarOpenChange: actions.onCalendarOpenChange,
    handleCalendarDayClick: actions.onCalendarDayClick,
    handlePreviousMonth: actions.onPreviousMonth,
    handleNextMonth: actions.onNextMonth,
    handleGoToToday: actions.onGoToToday,
    handleGoToPreviousDay: actions.onGoToPreviousDay,
    handleGoToNextDay: actions.onGoToNextDay,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
