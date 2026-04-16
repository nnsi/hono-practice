export const mobileTestIds = {
  login: {
    screen: "login.screen",
    loginIdInput: "login.loginIdInput",
    passwordInput: "login.passwordInput",
    submitButton: "login.submit",
  },
  tabs: {
    home: "tabs.home",
    daily: "tabs.daily",
    stats: "tabs.stats",
    goals: "tabs.goals",
    tasks: "tabs.tasks",
    notes: "tabs.notes",
  },
  notes: {
    page: "notes.page",
    detailPage: "notes.detail.page",
    addButton: "notes.add",
    emptyCreateButton: "notes.emptyCreate",
    settingsButton: "notes.settings",
    settingsPanel: "notes.settings.panel",
    titleInput: "notes.titleInput",
    saveButton: "notes.save",
    e2eFillSampleButton: "notes.e2e.fillSample",
    e2ePreviewText: "notes.e2e.preview",
  },
  tasks: {
    page: "tasks.page",
    activeTab: "tasks.tab.active",
    archivedTab: "tasks.tab.archived",
    emptyCreateButton: "tasks.emptyCreate",
    addButton: "tasks.add",
    createDialog: "tasks.create.dialog",
    createTitleInput: "tasks.create.titleInput",
    createMemoInput: "tasks.create.memoInput",
    createCancelButton: "tasks.create.cancel",
    createSubmitButton: "tasks.create.submit",
  },
} as const;

function sanitizeTestIdSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
}

export function buildTaskCardTestIds(taskId: string) {
  const suffix = sanitizeTestIdSegment(taskId);
  return {
    card: `tasks.card.${suffix}`,
    toggle: `tasks.toggle.${suffix}`,
    title: `tasks.title.${suffix}`,
    moveToToday: `tasks.moveToToday.${suffix}`,
    archive: `tasks.archive.${suffix}`,
    edit: `tasks.edit.${suffix}`,
    delete: `tasks.delete.${suffix}`,
  };
}
