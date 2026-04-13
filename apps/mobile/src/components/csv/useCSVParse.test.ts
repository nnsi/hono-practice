import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDocumentAsyncMock, readAsStringAsyncMock, parseCSVTextMock } =
  vi.hoisted(() => ({
    getDocumentAsyncMock: vi.fn(),
    readAsStringAsyncMock: vi.fn(),
    parseCSVTextMock: vi.fn(),
  }));

vi.mock("expo-document-picker", () => ({
  getDocumentAsync: getDocumentAsyncMock,
}));

vi.mock("expo-file-system/legacy", () => ({
  EncodingType: { UTF8: "utf8" },
  readAsStringAsync: readAsStringAsyncMock,
}));

vi.mock("@packages/domain/csv/csvParser", () => ({
  autoDetectMapping: vi.fn(() => ({})),
  parseCSVText: parseCSVTextMock,
  validateDate: vi.fn(() => null),
  validateQuantity: vi.fn(() => ({ error: null })),
}));

vi.mock("@packages/i18n", () => ({
  i18next: {
    t: vi.fn((key: string) => `csv:${key}`),
  },
}));

import { pickAndParseCSV } from "./useCSVParse";

describe("pickAndParseCSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets a localized noData error when the CSV has no rows", async () => {
    getDocumentAsyncMock.mockResolvedValue({
      canceled: false,
      assets: [{ name: "empty.csv", uri: "file://empty.csv" }],
    });
    readAsStringAsyncMock.mockResolvedValue("date,quantity");
    parseCSVTextMock.mockReturnValue({
      headers: ["date", "quantity"],
      data: [],
    });

    const setFileName = vi.fn();
    const setError = vi.fn();
    const setIsParsing = vi.fn();
    const onParsed = vi.fn();

    await pickAndParseCSV(setFileName, setError, setIsParsing, onParsed);

    expect(setFileName).toHaveBeenCalledWith("empty.csv");
    expect(setError).toHaveBeenCalledWith("csv:noData");
    expect(onParsed).not.toHaveBeenCalled();
    expect(setIsParsing).toHaveBeenNthCalledWith(1, true);
    expect(setIsParsing).toHaveBeenLastCalledWith(false);
  });

  it("sets a localized parseError when reading the file fails", async () => {
    getDocumentAsyncMock.mockResolvedValue({
      canceled: false,
      assets: [{ name: "broken.csv", uri: "file://broken.csv" }],
    });
    readAsStringAsyncMock.mockRejectedValue(new Error("read failed"));

    const setFileName = vi.fn();
    const setError = vi.fn();
    const setIsParsing = vi.fn();
    const onParsed = vi.fn();

    await pickAndParseCSV(setFileName, setError, setIsParsing, onParsed);

    expect(setFileName).toHaveBeenCalledWith("broken.csv");
    expect(setError).toHaveBeenCalledWith("csv:parseError");
    expect(onParsed).not.toHaveBeenCalled();
    expect(setIsParsing).toHaveBeenNthCalledWith(1, true);
    expect(setIsParsing).toHaveBeenLastCalledWith(false);
  });
});
