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
