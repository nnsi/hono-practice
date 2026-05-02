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
    backButton: "notes.detail.back",
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
    editDialog: "tasks.edit.dialog",
    editTitleInput: "tasks.edit.titleInput",
    editUpdateButton: "tasks.edit.update",
    editDeleteButton: "tasks.edit.delete",
    deleteConfirmDialog: "tasks.deleteConfirm.dialog",
    deleteConfirmButton: "tasks.deleteConfirm.confirm",
  },
  notesDelete: {
    confirmDialog: "notes.deleteConfirm.dialog",
    confirmButton: "notes.deleteConfirm.confirm",
    cardDeleteButton: "notes.card.delete",
  },
  actiko: {
    screen: "actiko.screen",
  },
  daily: {
    screen: "daily.screen",
    addActivityButton: "daily.addActivity",
  },
  stats: {
    screen: "stats.screen",
  },
  goals: {
    screen: "goals.screen",
    activeTab: "goals.tab.active",
    endedTab: "goals.tab.ended",
    createButton: "goals.create",
  },
  settings: {
    screen: "settings.screen",
    logoutButton: "settings.logout",
  },
  tabCustomization: {
    row: (key: string) => `settings.tabCustomization.row.${key}`,
    hideButton: (key: string) => `settings.tabCustomization.hide.${key}`,
    showButton: (key: string) => `settings.tabCustomization.show.${key}`,
  },
  statsActions: {
    prevMonth: "stats.prevMonth",
    nextMonth: "stats.nextMonth",
  },
  goalsCreate: {
    dialog: "goals.createDialog.dialog",
    activityOption: (id: string) => `goals.createDialog.activity.${id}`,
    targetInput: "goals.createDialog.targetInput",
    submit: "goals.createDialog.submit",
  },
  menu: {
    button: "common.menu",
    settingsItem: "common.menu.settings",
  },
  goalsEdit: {
    editButton: "goals.editButton",
    form: "goals.editForm",
    targetInput: "goals.editForm.targetInput",
    saveButton: "goals.editForm.save",
    deleteRequestButton: "goals.editForm.deleteRequest",
    deleteConfirmButton: "goals.editForm.deleteConfirm",
    deactivateRequestButton: "goals.editForm.deactivateRequest",
    deactivateConfirmButton: "goals.editForm.deactivateConfirm",
  },
  actikoCard: {
    activity: (id: string) => `actiko.activity.${id}`,
  },
  recordDialog: {
    dialog: "recording.dialog",
    quantityInput: "recording.manual.quantityInput",
    saveButton: "recording.manual.save",
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
