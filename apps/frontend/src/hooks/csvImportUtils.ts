import type {
  ActivityLogValidationError,
  CSVParseResult,
  ColumnMapping,
  ValidatedActivityLog,
} from "@packages/domain/csv/csvParser";
import {
  detectEncoding,
  parseCSVText,
  validateDate,
  validateQuantity,
} from "@packages/domain/csv/csvParser";
import { i18next } from "@packages/i18n";

import type { DexieActivity, DexieActivityKind } from "../db/schema";

export type { ValidatedActivityLog };

export type CSVImportStep = "file" | "mapping" | "preview";

export type ImportProgress = {
  total: number;
  processed: number;
  succeeded: number;
  skipped: number;
  failed: number;
};

type Translate = (key: string) => string;

export const CSV_TEMPLATE_CONTENT =
  "date,activity,kind,quantity,memo\n2024-01-01,ランニング,ジョギング,5,朝ラン\n2024-01-02,読書,技術書,60,TypeScript本";

export function createEmptyImportProgress(total = 0): ImportProgress {
  return {
    total,
    processed: 0,
    succeeded: 0,
    skipped: 0,
    failed: 0,
  };
}

export async function parseCSVFile(file: File): Promise<CSVParseResult> {
  const buffer = await file.slice(0, 1024).arrayBuffer();
  const encoding = detectEncoding(buffer);
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file, encoding);
  });
  return parseCSVText(text);
}

export function validateRequiredMapping(
  columnMapping: ColumnMapping,
  t: Translate,
): string | null {
  const mappingErrors: string[] = [];
  if (!columnMapping.date) {
    mappingErrors.push(t("validation.dateRequired"));
  }
  if (!columnMapping.activity && !columnMapping.fixedActivityId) {
    mappingErrors.push(t("validation.activityOrFixed"));
  }
  if (!columnMapping.quantity) {
    mappingErrors.push(t("validation.quantityRequired"));
  }

  return mappingErrors.length > 0 ? mappingErrors.join("\n") : null;
}

export function getValidationSummaryError(
  logs: ValidatedActivityLog[],
  t: Translate,
): string | null {
  const totalErrors = logs.filter((log) => log.errors.length > 0).length;
  return totalErrors > 0
    ? `${totalErrors}${t("validation.errorsFound")}`
    : null;
}

export function buildValidatedLogs(
  rows: Record<string, string>[],
  columnMapping: ColumnMapping,
  activities: DexieActivity[],
  allKinds: DexieActivityKind[],
): ValidatedActivityLog[] {
  return rows.map((row) =>
    validateRowWithMapping(row, columnMapping, activities, allKinds),
  );
}

export function revalidateEditedLog(
  log: ValidatedActivityLog,
  field: keyof ValidatedActivityLog,
  value: string,
  columnMapping: ColumnMapping,
  activities: DexieActivity[],
  allKinds: DexieActivityKind[],
): ValidatedActivityLog {
  const updated = { ...log };

  switch (field) {
    case "quantity":
      updated.quantity = Number(value) || 0;
      break;
    case "date":
    case "activityName":
    case "kindName":
    case "memo":
      updated[field] = value;
      break;
    case "activityId":
    case "isNewActivity":
    case "errors":
      return log;
  }

  if (field === "activityName") {
    updated.kindName = "";
  }

  return validateRowWithMapping(
    toMappedRowData(updated, columnMapping),
    columnMapping,
    activities,
    allKinds,
  );
}

function toMappedRowData(
  log: ValidatedActivityLog,
  columnMapping: ColumnMapping,
): Record<string, string> {
  const rowData: Record<string, string> = {};
  if (columnMapping.date) {
    rowData[columnMapping.date] = log.date;
  }
  if (columnMapping.activity) {
    rowData[columnMapping.activity] = log.activityName;
  }
  if (columnMapping.kind && log.kindName) {
    rowData[columnMapping.kind] = log.kindName;
  }
  if (columnMapping.quantity) {
    rowData[columnMapping.quantity] = log.quantity.toString();
  }
  if (columnMapping.memo && log.memo) {
    rowData[columnMapping.memo] = log.memo;
  }
  return rowData;
}

function validateRowWithMapping(
  row: Record<string, string>,
  mapping: ColumnMapping,
  activities: DexieActivity[],
  allKinds: DexieActivityKind[],
): ValidatedActivityLog {
  const errors: ActivityLogValidationError[] = [];

  const date = mapping.date ? row[mapping.date] : "";
  let activityName = mapping.activity ? row[mapping.activity] : "";
  let activityId: string | undefined;
  let isFixedActivity = false;

  if (mapping.fixedActivityId) {
    const fixed = activities.find(
      (activity) => activity.id === mapping.fixedActivityId,
    );
    if (fixed) {
      activityName = fixed.name;
      activityId = fixed.id;
      isFixedActivity = true;
    }
  }

  const kindName = mapping.kind ? row[mapping.kind] : undefined;
  const quantityStr = mapping.quantity ? row[mapping.quantity] : "";
  const memo = mapping.memo ? row[mapping.memo] : undefined;

  const dateError = validateDate(date);
  if (dateError) {
    errors.push({ field: "date", message: dateError });
  }

  if (!isFixedActivity && !activityName) {
    errors.push({
      field: "activity",
      message: i18next.t("csv:validation.activityRequired"),
    });
  }

  const { value: quantity, error: quantityError } =
    validateQuantity(quantityStr);
  if (quantityError) {
    errors.push({ field: "quantity", message: quantityError });
  }

  let isNew = false;
  if (!isFixedActivity && activityName) {
    const existing = activities.find(
      (activity) => activity.name === activityName,
    );
    if (!existing) {
      isNew = true;
    } else {
      activityId = existing.id;
      if (kindName) {
        const kinds = allKinds.filter(
          (kind) => kind.activityId === existing.id,
        );
        const hasKind = kinds.some((kind) => kind.name === kindName);
        if (!hasKind) {
          errors.push({
            field: "kind",
            message: i18next.t("csv:validation.kindNotFound", {
              activity: activityName,
              kind: kindName,
            }),
          });
        }
      }
    }
  }

  return {
    date: date || "",
    activityName: activityName || "",
    activityId,
    kindName,
    quantity,
    memo,
    isNewActivity: isNew,
    errors,
  };
}
