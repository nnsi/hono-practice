// --- Types ---

export type CSVParseResult = {
  data: Record<string, string>[];
  headers: string[];
};

export type ColumnMapping = {
  date?: string;
  activity?: string;
  kind?: string;
  quantity?: string;
  memo?: string;
  fixedActivityId?: string;
};

export type ActivityLogValidationError = {
  field: string;
  message: string;
};

export type ValidatedActivityLog = {
  date: string;
  activityName: string;
  activityId?: string;
  kindName?: string;
  quantity: number;
  memo?: string;
  isNewActivity: boolean;
  errors: ActivityLogValidationError[];
};

// --- Encoding Detection ---

export function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "UTF-8";
  }
  let utf8Count = 0;
  let sjisCount = 0;
  const len = Math.min(bytes.length, 1024);

  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    // UTF-8 multi-byte sequences
    if (b >= 0xc2 && b <= 0xdf && i + 1 < len) {
      if (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xbf) {
        utf8Count++;
        i += 1;
        continue;
      }
    } else if (b >= 0xe0 && b <= 0xef && i + 2 < len) {
      if (
        bytes[i + 1] >= 0x80 &&
        bytes[i + 1] <= 0xbf &&
        bytes[i + 2] >= 0x80 &&
        bytes[i + 2] <= 0xbf
      ) {
        utf8Count++;
        i += 2;
        continue;
      }
    } else if (b >= 0xf0 && b <= 0xf4 && i + 3 < len) {
      if (
        bytes[i + 1] >= 0x80 &&
        bytes[i + 1] <= 0xbf &&
        bytes[i + 2] >= 0x80 &&
        bytes[i + 2] <= 0xbf &&
        bytes[i + 3] >= 0x80 &&
        bytes[i + 3] <= 0xbf
      ) {
        utf8Count++;
        i += 3;
        continue;
      }
    }
    // Shift-JIS multi-byte sequences
    if ((b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc)) {
      if (i + 1 < len) {
        const b2 = bytes[i + 1];
        if ((b2 >= 0x40 && b2 <= 0x7e) || (b2 >= 0x80 && b2 <= 0xfc)) {
          sjisCount++;
          i += 1;
        }
      }
    }
  }
  return sjisCount > utf8Count ? "Shift-JIS" : "UTF-8";
}

// --- CSV Parsing ---

export function parseCSVText(text: string): CSVParseResult {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      current += ch;
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += text[i + 1];
          i++;
        } else {
          inQuotes = false;
        }
      }
    } else if (ch === '"') {
      inQuotes = true;
      current += ch;
    } else if (ch === "\n" || ch === "\r") {
      lines.push(current);
      current = "";
      if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") {
        i++;
      }
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);

  const nonEmpty = lines.filter((l) => l.trim() !== "");
  if (nonEmpty.length === 0) return { data: [], headers: [] };

  const splitRow = (line: string): string[] => {
    const fields: string[] = [];
    let field = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQ = true;
      } else if (c === ",") {
        fields.push(field);
        field = "";
      } else {
        field += c;
      }
    }
    fields.push(field);
    return fields;
  };

  const headers = splitRow(nonEmpty[0]);
  const data = nonEmpty.slice(1).map((line) => {
    const values = splitRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });

  return { data, headers };
}

// --- Validation ---

export function validateDate(dateStr: string): string | null {
  if (!dateStr) return "日付は必須です";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "日付の形式が不正です";
  if (d > new Date()) return "未来の日付は指定できません";
  return null;
}

export function validateQuantity(str: string): {
  value: number;
  error: string | null;
} {
  if (str === "" || str == null) return { value: 0, error: "数量は必須です" };
  const num = Number(str);
  if (Number.isNaN(num))
    return { value: 0, error: "数量は数値で入力してください" };
  if (num < 0) return { value: 0, error: "数量は0以上で入力してください" };
  if (num > 999999) return { value: 0, error: "数量が大きすぎます" };
  return { value: num, error: null };
}

// --- Auto-detect Mapping ---

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const lower = header.toLowerCase();
    if (lower.includes("date") || lower.includes("日付")) {
      mapping.date = header;
    } else if (
      lower.includes("activity") ||
      lower.includes("活動") ||
      lower.includes("アクティビティ")
    ) {
      mapping.activity = header;
    } else if (
      lower.includes("kind") ||
      lower.includes("種別") ||
      lower.includes("タイプ")
    ) {
      mapping.kind = header;
    } else if (
      lower.includes("quantity") ||
      lower.includes("数量") ||
      lower.includes("時間") ||
      lower.includes("回数") ||
      lower === "count" ||
      lower === "cnt"
    ) {
      mapping.quantity = header;
    } else if (
      lower.includes("memo") ||
      lower.includes("メモ") ||
      lower.includes("備考")
    ) {
      mapping.memo = header;
    }
  }
  return mapping;
}
