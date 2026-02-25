// --- Types for CSV Export ---

type CSVExportLog = {
  activityId: string;
  activityKindId: string | null;
  date: string;
  quantity: number | null;
  memo: string;
};

type CSVExportActivity = {
  name: string;
};

type CSVExportKind = {
  name: string;
};

// --- CSV Field Escaping ---

export function escapeCSVField(value: string): string {
  // CSV injection prevention: prefix formula-triggering characters with a tab
  const sanitized =
    value.length > 0 && "=+-@".includes(value[0]) ? `\t${value}` : value;
  if (
    sanitized.includes(",") ||
    sanitized.includes('"') ||
    sanitized.includes("\n")
  ) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

// --- CSV Content Builder ---

export function buildCSVContent(
  logs: CSVExportLog[],
  activityMap: Map<string, CSVExportActivity>,
  kindMap: Map<string, CSVExportKind>,
): string {
  const BOM = "\uFEFF";
  const headers = ["date", "activity", "kind", "quantity", "memo"];
  const rows = logs.map((log) => {
    const activity = activityMap.get(log.activityId);
    const kind = log.activityKindId
      ? kindMap.get(log.activityKindId)
      : undefined;
    return [
      log.date,
      activity?.name ?? "",
      kind?.name ?? "",
      log.quantity?.toString() ?? "0",
      log.memo ?? "",
    ]
      .map(escapeCSVField)
      .join(",");
  });
  return BOM + [headers.join(","), ...rows].join("\n");
}
