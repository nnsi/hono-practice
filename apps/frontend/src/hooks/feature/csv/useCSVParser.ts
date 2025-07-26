import { useCallback, useState } from "react";

import Papa from "papaparse";

export type CSVParseResult = {
  data: Record<string, string>[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
};

export type CSVParseOptions = {
  header?: boolean;
  skipEmptyLines?: boolean;
  encoding?: string;
};

export function useCSVParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectEncoding = useCallback(async (file: File): Promise<string> => {
    // 最初の数バイトを読み取ってエンコーディングを検出
    const slice = file.slice(0, 1024);
    const buffer = await slice.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // BOMチェック
    if (
      uint8Array[0] === 0xef &&
      uint8Array[1] === 0xbb &&
      uint8Array[2] === 0xbf
    ) {
      return "UTF-8";
    }

    // 簡易的なShift-JIS検出（日本語の頻出バイトパターン）
    let shiftJisCount = 0;
    for (let i = 0; i < uint8Array.length - 1; i++) {
      const byte1 = uint8Array[i];
      const byte2 = uint8Array[i + 1];

      // Shift-JISの2バイト文字の範囲
      if (
        (byte1 >= 0x81 && byte1 <= 0x9f) ||
        (byte1 >= 0xe0 && byte1 <= 0xfc)
      ) {
        if (
          (byte2 >= 0x40 && byte2 <= 0x7e) ||
          (byte2 >= 0x80 && byte2 <= 0xfc)
        ) {
          shiftJisCount++;
        }
      }
    }

    // Shift-JISパターンが多い場合はShift-JISと判定
    return shiftJisCount > 5 ? "Shift-JIS" : "UTF-8";
  }, []);

  const parseFile = useCallback(
    async (
      file: File,
      options: CSVParseOptions = {},
    ): Promise<CSVParseResult> => {
      setIsLoading(true);
      setError(null);

      try {
        // エンコーディング自動検出
        const detectedEncoding =
          options.encoding || (await detectEncoding(file));

        // FileReaderでファイルを読み込み
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file, detectedEncoding);
        });

        // PapaParseでCSVをパース
        const result = Papa.parse<Record<string, string>>(text, {
          header: options.header !== false,
          skipEmptyLines: options.skipEmptyLines !== false,
          dynamicTyping: false, // 文字列として扱う
        });

        return {
          data: result.data,
          errors: result.errors,
          meta: result.meta,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "CSVファイルの読み込みに失敗しました";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [detectEncoding],
  );

  const parseText = useCallback(
    (text: string, options: CSVParseOptions = {}): CSVParseResult => {
      const result = Papa.parse<Record<string, string>>(text, {
        header: options.header !== false,
        skipEmptyLines: options.skipEmptyLines !== false,
        dynamicTyping: false,
      });

      return {
        data: result.data,
        errors: result.errors,
        meta: result.meta,
      };
    },
    [],
  );

  return {
    parseFile,
    parseText,
    isLoading,
    error,
  };
}
