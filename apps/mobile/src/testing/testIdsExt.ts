// Additional testIDs introduced for E2E coverage of recording modes / settings /
// goal detail / etc. Kept in a separate file from testIds.ts to respect the
// 200-line file budget.

export const mobileTestIdsExt = {
  recordingShared: {
    memoInput: "recording.memoInput",
    kindOption: (id: string) => `recording.kindSelector.${id}`,
  },
  recordingTimer: {
    startButton: "recording.timer.start",
    stopButton: "recording.timer.stop",
    resetButton: "recording.timer.reset",
    saveButton: "recording.timer.save",
    timerTab: "recording.timer.tab.timer",
    manualTab: "recording.timer.tab.manual",
  },
  recordingCounter: {
    stepButton: (i: number) => `recording.counter.step.${i}`,
    counterTab: "recording.counter.tab.counter",
    manualTab: "recording.counter.tab.manual",
  },
  recordingBinary: {
    kindButton: (id: string) => `recording.binary.kind.${id}`,
  },
  recordingNumpad: {
    key: (k: string) => `recording.numpad.key.${k}`,
    saveButton: "recording.numpad.save",
  },
  recordingCheck: {
    mainButton: "recording.check.main",
    kindButton: (id: string) => `recording.check.kind.${id}`,
  },
  dateNav: {
    prev: "dateNav.prev",
    next: "dateNav.next",
    label: "dateNav.label",
  },
  tasksGroup: {
    section: (key: string) => `tasks.section.${key}`,
  },
  settingsToggle: {
    showGoalOnStartup: "settings.toggle.showGoalOnStartup",
    showInactiveDates: "settings.toggle.showInactiveDates",
    praiseMode: "settings.toggle.praiseMode",
  },
  goalDayTargets: {
    toggle: "goal.dayTargetsToggle",
    input: (k: string) => `goal.dayTarget.${k}`,
  },
  goalFreeze: {
    todayButton: "goal.freeze.today",
    byDateButton: "goal.freeze.byDate",
    resumeButton: "goal.freeze.resume",
  },
  goalDebtCap: {
    toggle: "goal.debtCap.toggle",
    input: "goal.debtCap.input",
  },
  activityKindList: {
    addButton: "actiko.editKind.add",
    nameInput: (i: number) => `actiko.editKind.name.${i}`,
    removeButton: (i: number) => `actiko.editKind.remove.${i}`,
    colorButton: (i: number, color: string) =>
      `actiko.editKind.color.${i}.${color}`,
  },
  upgrade: {
    page: "upgrade.page",
    backButton: "upgrade.back",
    purchaseButton: "upgrade.purchase",
    restoreButton: "upgrade.restore",
    statusBar: "upgrade.statusBar",
    premiumBadge: "upgrade.premiumBadge",
  },
  subscriptionSection: {
    badge: "settings.subscription.badge",
    upgradeLink: "settings.subscription.upgradeLink",
  },
  devTools: {
    section: "settings.dev.section",
    forcedOfflineToggle: "settings.dev.forcedOffline",
    refreshPlanButton: "settings.dev.refreshPlan",
  },
  noteCard: {
    pending: "notes.card.pending",
  },
} as const;
