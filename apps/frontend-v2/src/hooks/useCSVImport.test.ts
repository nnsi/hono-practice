import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  autoDetectMapping,
  detectEncoding,
  parseCSVText,
  validateDate,
  validateQuantity,
} from "@packages/domain/csv/csvParser";

describe("autoDetectMapping", () => {
  // --- 英語ヘッダー ---
  it("英語ヘッダーが全てマッピングされる", () => {
    const headers = ["date", "activity", "kind", "quantity", "memo"];
    const result = autoDetectMapping(headers);
    expect(result).toEqual({
      date: "date",
      activity: "activity",
      kind: "kind",
      quantity: "quantity",
      memo: "memo",
    });
  });

  // --- 日本語ヘッダー ---
  it("日本語ヘッダーが全てマッピングされる", () => {
    const headers = ["日付", "活動", "種別", "数量", "メモ"];
    const result = autoDetectMapping(headers);
    expect(result).toEqual({
      date: "日付",
      activity: "活動",
      kind: "種別",
      quantity: "数量",
      memo: "メモ",
    });
  });

  // --- 代替日本語ヘッダー ---
  it("代替の日本語ヘッダーがマッピングされる", () => {
    const headers = ["日付", "アクティビティ", "タイプ", "時間", "備考"];
    const result = autoDetectMapping(headers);
    expect(result).toEqual({
      date: "日付",
      activity: "アクティビティ",
      kind: "タイプ",
      quantity: "時間",
      memo: "備考",
    });
  });

  // --- 大文字小文字の区別なし ---
  it("大文字小文字を区別せずマッピングされる", () => {
    const headers = ["Date", "Activity", "Kind", "Quantity", "Memo"];
    const result = autoDetectMapping(headers);
    expect(result).toEqual({
      date: "Date",
      activity: "Activity",
      kind: "Kind",
      quantity: "Quantity",
      memo: "Memo",
    });
  });

  it("全て大文字でもマッピングされる", () => {
    const headers = ["DATE", "ACTIVITY", "KIND", "QUANTITY", "MEMO"];
    const result = autoDetectMapping(headers);
    expect(result).toEqual({
      date: "DATE",
      activity: "ACTIVITY",
      kind: "KIND",
      quantity: "QUANTITY",
      memo: "MEMO",
    });
  });

  // --- 部分一致 ---
  it("部分的なヘッダーのみマッピングされる", () => {
    const headers = ["date", "quantity"];
    const result = autoDetectMapping(headers);
    expect(result).toEqual({
      date: "date",
      quantity: "quantity",
    });
    expect(result.activity).toBeUndefined();
    expect(result.kind).toBeUndefined();
    expect(result.memo).toBeUndefined();
  });

  // --- 空ヘッダー ---
  it("空のヘッダー配列 → 空のマッピング", () => {
    const result = autoDetectMapping([]);
    expect(result).toEqual({});
  });

  // --- count / cnt → quantity ---
  it('"count" → quantity にマッピングされる', () => {
    const result = autoDetectMapping(["count"]);
    expect(result.quantity).toBe("count");
  });

  it('"cnt" → quantity にマッピングされる', () => {
    const result = autoDetectMapping(["cnt"]);
    expect(result.quantity).toBe("cnt");
  });

  // --- 回数 → quantity ---
  it('"回数" → quantity にマッピングされる', () => {
    const result = autoDetectMapping(["回数"]);
    expect(result.quantity).toBe("回数");
  });

  // --- 不明なヘッダーは無視 ---
  it("認識できないヘッダーは無視される", () => {
    const headers = ["foo", "bar", "baz"];
    const result = autoDetectMapping(headers);
    expect(result).toEqual({});
  });

  it("認識可能と不明なヘッダーの混在", () => {
    const headers = ["date", "unknown_col", "memo", "extra"];
    const result = autoDetectMapping(headers);
    expect(result).toEqual({
      date: "date",
      memo: "memo",
    });
  });

  // --- "activity_kind" ヘッダーの優先順位 ---
  it('"activity_kind" はactivityに先にマッチする（else ifチェーン）', () => {
    // "activity_kind" は includes("activity") が true → activity にマッチ
    // includes("kind") のチェックには到達しない
    const result = autoDetectMapping(["activity_kind"]);
    expect(result.activity).toBe("activity_kind");
    expect(result.kind).toBeUndefined();
  });

  // --- includes による部分文字列マッチ ---
  it("ヘッダーにキーワードが含まれていればマッピングされる（部分文字列一致）", () => {
    const headers = [
      "event_date",
      "main_activity",
      "activity_kind",
      "total_quantity",
      "memo_notes",
    ];
    const result = autoDetectMapping(headers);
    expect(result.date).toBe("event_date");
    // "activity_kind" も includes("activity") に一致するため activity を上書きする
    // ロジック的には各ヘッダーが順にチェックされ、最後にマッチしたヘッダーが残る
    expect(result.activity).toBe("activity_kind");
    // "activity_kind" が activity にマッチしてしまうため kind はマッピングされない
    expect(result.kind).toBeUndefined();
    expect(result.quantity).toBe("total_quantity");
    expect(result.memo).toBe("memo_notes");
  });

  // --- 最初にマッチした条件がカラムを決定（else if チェーン）---
  it("else if チェーンにより、最初にマッチした条件がカラムを決定する", () => {
    // "date_activity" は date を含むので date にマッピング（activity ではない）
    const result = autoDetectMapping(["date_activity"]);
    expect(result.date).toBe("date_activity");
    expect(result.activity).toBeUndefined();
  });

  // --- 複数マッチ時は最後のヘッダーで上書きされる ---
  it("同じカラムに複数ヘッダーがマッチする場合、最後のヘッダーで上書きされる", () => {
    // "日付1" と "日付2" 両方が date にマッチ → 最後の "日付2" が残る
    const result = autoDetectMapping(["日付1", "日付2"]);
    expect(result.date).toBe("日付2");
  });
});

// --- detectEncoding ---
describe("detectEncoding", () => {
  it("UTF-8 BOM付きバッファ → UTF-8", () => {
    const buffer = new Uint8Array([0xef, 0xbb, 0xbf, 0x41, 0x42]).buffer;
    expect(detectEncoding(buffer)).toBe("UTF-8");
  });

  it("ASCII のみ → UTF-8", () => {
    const buffer = new TextEncoder().encode("hello,world\n1,2").buffer;
    expect(detectEncoding(buffer)).toBe("UTF-8");
  });

  it("UTF-8 日本語 → UTF-8", () => {
    const buffer = new TextEncoder().encode("日付,活動,数量").buffer;
    expect(detectEncoding(buffer)).toBe("UTF-8");
  });

  it("Shift-JIS バイト列 → Shift-JIS", () => {
    // "あ" in Shift-JIS = 0x82 0xA0
    // "い" in Shift-JIS = 0x82 0xA2
    // 複数のShift-JIS文字を含むバイト列
    const bytes = new Uint8Array([
      0x82, 0xa0, 0x2c, 0x82, 0xa2, 0x2c, 0x82, 0xa4,
    ]);
    expect(detectEncoding(bytes.buffer)).toBe("Shift-JIS");
  });

  it("空バッファ → UTF-8（デフォルト）", () => {
    const buffer = new ArrayBuffer(0);
    expect(detectEncoding(buffer)).toBe("UTF-8");
  });
});

// --- parseCSVText ---
describe("parseCSVText", () => {
  it("基本的なCSVをパースする", () => {
    const result = parseCSVText("name,age\nAlice,30\nBob,25");
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ name: "Alice", age: "30" });
    expect(result.data[1]).toEqual({ name: "Bob", age: "25" });
  });

  it("空文字列 → 空のデータ", () => {
    const result = parseCSVText("");
    expect(result.headers).toEqual([]);
    expect(result.data).toEqual([]);
  });

  it("ヘッダー行のみ → 空のデータ配列", () => {
    const result = parseCSVText("name,age");
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.data).toEqual([]);
  });

  it("ダブルクォートで囲まれたフィールド（カンマなし）をパースする", () => {
    const result = parseCSVText('name,memo\nAlice,"hello world"');
    expect(result.data[0]).toEqual({ name: "Alice", memo: "hello world" });
  });

  it("カンマを含むクォートフィールドが正しくパースされる", () => {
    const result = parseCSVText('name,memo\nAlice,"hello, world"');
    expect(result.data[0]).toEqual({ name: "Alice", memo: "hello, world" });
  });

  it("エスケープされたダブルクォートが正しく保持される", () => {
    const result = parseCSVText('name,memo\nAlice,"say ""hi"""');
    expect(result.data[0]).toEqual({ name: "Alice", memo: 'say "hi"' });
  });

  it("CRLF改行を処理する", () => {
    const result = parseCSVText("name,age\r\nAlice,30\r\nBob,25");
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ name: "Alice", age: "30" });
  });

  it("空行をスキップする", () => {
    const result = parseCSVText("name,age\n\nAlice,30\n\nBob,25\n");
    expect(result.data).toHaveLength(2);
  });

  it("フィールド数がヘッダーより少ない場合、空文字で埋める", () => {
    const result = parseCSVText("a,b,c\n1");
    expect(result.data[0]).toEqual({ a: "1", b: "", c: "" });
  });
});

// --- validateDate ---
describe("validateDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("有効な日付 → null（エラーなし）", () => {
    expect(validateDate("2025-01-15")).toBeNull();
  });

  it("空文字 → 必須エラー", () => {
    expect(validateDate("")).toBe("日付は必須です");
  });

  it("不正な日付形式 → フォーマットエラー", () => {
    expect(validateDate("abc")).toBe("日付の形式が不正です");
  });

  it("未来の日付 → 未来日付エラー", () => {
    expect(validateDate("2099-01-01")).toBe("未来の日付は指定できません");
  });

  it("今日の日付 → エラーなし", () => {
    expect(validateDate("2025-06-15")).toBeNull();
  });

  it("昨日の日付 → エラーなし", () => {
    expect(validateDate("2025-06-14")).toBeNull();
  });
});

// --- validateQuantity ---
describe("validateQuantity", () => {
  it("正常な数値文字列 → value=数値, error=null", () => {
    expect(validateQuantity("5")).toEqual({ value: 5, error: null });
  });

  it("小数 → value=小数, error=null", () => {
    expect(validateQuantity("3.14")).toEqual({ value: 3.14, error: null });
  });

  it("0 → value=0, error=null", () => {
    expect(validateQuantity("0")).toEqual({ value: 0, error: null });
  });

  it("空文字 → 必須エラー", () => {
    expect(validateQuantity("")).toEqual({ value: 0, error: "数量は必須です" });
  });

  it("非数値文字列 → NaNエラー", () => {
    expect(validateQuantity("abc")).toEqual({
      value: 0,
      error: "数量は数値で入力してください",
    });
  });

  it("負の数 → 負数エラー", () => {
    expect(validateQuantity("-1")).toEqual({
      value: 0,
      error: "数量は0以上で入力してください",
    });
  });

  it("上限超え → 上限エラー", () => {
    expect(validateQuantity("1000000")).toEqual({
      value: 0,
      error: "数量が大きすぎます",
    });
  });

  it("境界値: 999999 → OK", () => {
    expect(validateQuantity("999999")).toEqual({ value: 999999, error: null });
  });
});
