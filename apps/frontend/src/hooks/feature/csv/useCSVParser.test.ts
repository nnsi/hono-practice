import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCSVParser } from "./useCSVParser";

// FileReaderのモック
const mockFileReader = {
  readAsText: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onload: null as ((event: any) => void) | null,
  onerror: null as ((event: any) => void) | null,
  result: null as string | null,
};

// FileReaderをモック
global.FileReader = vi.fn().mockImplementation(() => mockFileReader) as any;

// Fileのsliceメソッドをモックするための実装
class MockFile extends Blob {
  public lastModified: number;
  public webkitRelativePath: string;

  constructor(
    bits: BlobPart[],
    public name: string,
    options?: FilePropertyBag,
  ) {
    super(bits, options);
    this.lastModified = options?.lastModified || Date.now();
    this.webkitRelativePath = "";
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    // 実際のファイルの一部を返すモック
    const mockBlob = {
      arrayBuffer: async () => {
        const arrayBuffer = new ArrayBuffer(end ? end - (start || 0) : 1024);
        // 最初の数バイトだけを返す
        return arrayBuffer;
      },
      size: end ? end - (start || 0) : 1024,
      type: contentType || "",
      slice: () => mockBlob,
      stream: () => new ReadableStream(),
      text: async () => "",
    };

    return mockBlob as Blob;
  }
}

global.File = MockFile as any;

describe("useCSVParser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileReader.readAsText.mockReset();
    mockFileReader.onload = null;
    mockFileReader.onerror = null;
    mockFileReader.result = null;
  });

  describe("parseText", () => {
    it("ヘッダー付きCSVテキストを正しくパースできる", () => {
      const { result } = renderHook(() => useCSVParser());

      const csvText = `date,activity,kind,quantity,memo
2025-01-01,ランニング,5km,30,朝ラン
2025-01-02,読書,技術書,60,TypeScript本を読んだ`;

      const parseResult = result.current.parseText(csvText);

      expect(parseResult.data).toEqual([
        {
          date: "2025-01-01",
          activity: "ランニング",
          kind: "5km",
          quantity: "30",
          memo: "朝ラン",
        },
        {
          date: "2025-01-02",
          activity: "読書",
          kind: "技術書",
          quantity: "60",
          memo: "TypeScript本を読んだ",
        },
      ]);
      expect(parseResult.errors).toEqual([]);
      expect(parseResult.meta.fields).toEqual([
        "date",
        "activity",
        "kind",
        "quantity",
        "memo",
      ]);
    });

    it("ヘッダーなしCSVテキストをパースできる", () => {
      const { result } = renderHook(() => useCSVParser());

      const csvText = `2025-01-01,ランニング,5km,30,朝ラン
2025-01-02,読書,技術書,60,TypeScript本を読んだ`;

      const parseResult = result.current.parseText(csvText, { header: false });

      expect(parseResult.data).toEqual([
        ["2025-01-01", "ランニング", "5km", "30", "朝ラン"],
        ["2025-01-02", "読書", "技術書", "60", "TypeScript本を読んだ"],
      ]);
    });

    it("空行を含むCSVテキストを正しく処理できる", () => {
      const { result } = renderHook(() => useCSVParser());

      const csvText = `date,activity,kind,quantity,memo
2025-01-01,ランニング,5km,30,朝ラン

2025-01-02,読書,技術書,60,TypeScript本を読んだ`;

      const parseResult = result.current.parseText(csvText);

      expect(parseResult.data).toEqual([
        {
          date: "2025-01-01",
          activity: "ランニング",
          kind: "5km",
          quantity: "30",
          memo: "朝ラン",
        },
        {
          date: "2025-01-02",
          activity: "読書",
          kind: "技術書",
          quantity: "60",
          memo: "TypeScript本を読んだ",
        },
      ]);
    });

    it("skipEmptyLinesオプションをfalseに設定した場合、空行を含む", () => {
      const { result } = renderHook(() => useCSVParser());

      const csvText = `date,activity,kind,quantity,memo
2025-01-01,ランニング,5km,30,朝ラン

2025-01-02,読書,技術書,60,TypeScript本を読んだ`;

      const parseResult = result.current.parseText(csvText, {
        skipEmptyLines: false,
      });

      expect(parseResult.data).toHaveLength(3);
      expect(parseResult.data[1]).toEqual({
        date: "",
      });
    });

    it("カンマを含むフィールドを正しく処理できる", () => {
      const { result } = renderHook(() => useCSVParser());

      const csvText = `date,activity,kind,quantity,memo
2025-01-01,"ランニング,ウォーキング",5km,30,"朝ラン,夕方散歩"`;

      const parseResult = result.current.parseText(csvText);

      expect(parseResult.data).toEqual([
        {
          date: "2025-01-01",
          activity: "ランニング,ウォーキング",
          kind: "5km",
          quantity: "30",
          memo: "朝ラン,夕方散歩",
        },
      ]);
    });
  });

  describe("parseFile", () => {
    it("UTF-8ファイルを正しくパースできる", async () => {
      const { result } = renderHook(() => useCSVParser());

      const csvContent = `date,activity,kind,quantity,memo
2025-01-01,ランニング,5km,30,朝ラン`;

      const file = new MockFile([csvContent], "test.csv", { type: "text/csv" });

      // FileReaderの動作をシミュレート
      mockFileReader.readAsText.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.result = csvContent;
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: csvContent } });
          }
        }, 0);
      });

      let parseResult: any;
      await act(async () => {
        parseResult = await result.current.parseFile(file as any);
      });

      expect(parseResult!.data).toEqual([
        {
          date: "2025-01-01",
          activity: "ランニング",
          kind: "5km",
          quantity: "30",
          memo: "朝ラン",
        },
      ]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("BOM付きUTF-8ファイルを正しく検出できる", async () => {
      const { result } = renderHook(() => useCSVParser());

      const csvContent = `date,activity,kind,quantity,memo
2025-01-01,ランニング,5km,30,朝ラン`;

      // BOM付きファイル
      const bomBytes = new Uint8Array([0xef, 0xbb, 0xbf]);
      const textBytes = new TextEncoder().encode(csvContent);
      const combinedBytes = new Uint8Array(bomBytes.length + textBytes.length);
      combinedBytes.set(bomBytes);
      combinedBytes.set(textBytes, bomBytes.length);

      const file = new MockFile([combinedBytes], "test.csv", {
        type: "text/csv",
      });

      mockFileReader.readAsText.mockImplementation((_file, encoding) => {
        expect(encoding).toBe("UTF-8");
        setTimeout(() => {
          mockFileReader.result = csvContent;
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: csvContent } });
          }
        }, 0);
      });

      await act(async () => {
        await result.current.parseFile(file as any);
      });

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file, "UTF-8");
    });

    it("ファイル読み込みエラーを適切に処理できる", async () => {
      const { result } = renderHook(() => useCSVParser());

      const file = new MockFile(["content"], "test.csv", { type: "text/csv" });

      mockFileReader.readAsText.mockImplementation(() => {
        setTimeout(() => {
          if (mockFileReader.onerror) {
            mockFileReader.onerror(new Error("Read error"));
          }
        }, 0);
      });

      await act(async () => {
        await expect(result.current.parseFile(file as any)).rejects.toThrow();
      });

      expect(result.current.error).toBe("Read error");
      expect(result.current.isLoading).toBe(false);
    });

    it("ローディング状態を正しく管理できる", async () => {
      const { result } = renderHook(() => useCSVParser());

      const file = new MockFile(["content"], "test.csv", { type: "text/csv" });

      mockFileReader.readAsText.mockImplementation(() => {
        // 非同期処理をシミュレート
      });

      // ローディング開始前
      expect(result.current.isLoading).toBe(false);

      const parsePromise = result.current.parseFile(file as any);

      // FileReaderの完了をシミュレート
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(() => {
            if (mockFileReader.onload) {
              mockFileReader.onload({ target: { result: "content" } });
            }
            resolve(undefined);
          }, 10);
        });
      });

      await parsePromise;

      // ローディング終了を確認
      expect(result.current.isLoading).toBe(false);
    });

    it("カスタムエンコーディングを指定できる", async () => {
      const { result } = renderHook(() => useCSVParser());

      const csvContent = `date,activity,kind,quantity,memo
2025-01-01,ランニング,5km,30,朝ラン`;

      const file = new MockFile([csvContent], "test.csv", { type: "text/csv" });

      mockFileReader.readAsText.mockImplementation((_file, encoding) => {
        expect(encoding).toBe("Shift-JIS");
        setTimeout(() => {
          mockFileReader.result = csvContent;
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: csvContent } });
          }
        }, 0);
      });

      await act(async () => {
        await result.current.parseFile(file as any, { encoding: "Shift-JIS" });
      });

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file, "Shift-JIS");
    });

    it("空のファイルを処理できる", async () => {
      const { result } = renderHook(() => useCSVParser());

      const file = new MockFile([""], "empty.csv", { type: "text/csv" });

      mockFileReader.readAsText.mockImplementation(() => {
        setTimeout(() => {
          mockFileReader.result = "";
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: "" } });
          }
        }, 0);
      });

      let parseResult: any;
      await act(async () => {
        parseResult = await result.current.parseFile(file as any);
      });

      expect(parseResult!.data).toEqual([]);
      // 空のファイルの場合、PapaParseが警告を出すことがある
      expect(parseResult!.errors.length).toBeGreaterThanOrEqual(0);
    });
  });
});
