import {
  autoDetectMapping,
  parseCSVText,
  validateDate,
  validateQuantity,
} from "@packages/domain/csv/csvParser";
import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import * as DocumentPicker from "expo-document-picker";
import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";

type ParsedRow = { date: string; time: string; quantity: string; memo: string };

export function validateRow(row: ParsedRow): string[] {
  const errors: string[] = [];
  const dateError = validateDate(
    row.date.includes("T") ? row.date.split("T")[0] : row.date,
  );
  if (dateError) errors.push(dateError);
  if (row.quantity) {
    const { error } = validateQuantity(row.quantity);
    if (error) errors.push(error);
  }
  return errors;
}

export function downloadTemplateWeb() {
  const template =
    "date,activity,kind,quantity,memo\n2024-01-01,ランニング,ジョギング,5,朝ラン\n2024-01-02,読書,技術書,60,TypeScript本";
  const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "activity_log_template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export async function pickAndParseCSV(
  setFileName: (name: string) => void,
  setError: (err: string | null) => void,
  setIsParsing: (v: boolean) => void,
  onParsed: (rows: ParsedRow[]) => void,
): Promise<void> {
  setIsParsing(true);
  setError(null);
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "text/csv",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) {
      setIsParsing(false);
      return;
    }
    const asset = result.assets[0];
    setFileName(asset.name);

    const content = await readAsStringAsync(asset.uri, {
      encoding: EncodingType.UTF8,
    });

    const csvResult = parseCSVText(content);
    if (csvResult.data.length === 0) {
      setError("CSVデータが空です");
      setIsParsing(false);
      return;
    }

    const mapping = autoDetectMapping(csvResult.headers);
    const timeCol = csvResult.headers.find((h) => {
      const lower = h.toLowerCase();
      return lower.includes("time") || lower.includes("時刻");
    });

    const rows: ParsedRow[] = csvResult.data.map((record) => ({
      date:
        (mapping.date ? record[mapping.date] : record[csvResult.headers[0]]) ||
        getToday(),
      time: (timeCol ? record[timeCol] : "") || "",
      quantity:
        (mapping.quantity
          ? record[mapping.quantity]
          : record[csvResult.headers[2]]) || "",
      memo:
        (mapping.memo ? record[mapping.memo] : record[csvResult.headers[3]]) ||
        "",
    }));

    onParsed(rows);
  } catch {
    setError("ファイルの読み込みに失敗しました");
  } finally {
    setIsParsing(false);
  }
}
