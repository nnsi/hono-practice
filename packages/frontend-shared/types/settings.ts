export type AppSettings = {
  showGoalOnStartup: boolean;
  hideGoalGraph: boolean;
  showInactiveDates: boolean;
};

export const defaultSettings: AppSettings = {
  showGoalOnStartup: false,
  hideGoalGraph: false,
  showInactiveDates: false,
};
