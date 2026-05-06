/**
 * 文字列を UTF-8 バイト数で切り詰める。
 *
 * - JS の `String.length` / `slice()` は UTF-16 コードユニット単位なので、
 *   CJK や絵文字を含む文字列を「N バイト以内」に収めるには使えない。
 * - WAE blob のような「合計 5120 バイト」等のバイト境界制約を持つ
 *   ストレージへの書き込み前のサニタイズに使う。
 *
 * 実装上の保証: 戻り値の文字列を UTF-8 で再エンコードしても `maxBytes` 以下。
 * 不完全な UTF-8 シーケンスの途中で切れた場合は、その不完全部分を捨てる
 * （U+FFFD 置換は使わない: 置換文字 3 バイトで上限を超える可能性があるため）。
 */
export function clipBytes(value: string | undefined, maxBytes: number): string {
  if (!value) return "";
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  if (bytes.byteLength <= maxBytes) return value;

  // maxBytes より前で UTF-8 codepoint 境界に揃える
  // UTF-8: continuation byte は 10xxxxxx (0x80-0xBF)。先頭バイトでないものは捨てる。
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) {
    end--;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, end));
}
