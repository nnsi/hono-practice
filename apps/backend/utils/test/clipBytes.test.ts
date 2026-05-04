import { describe, expect, it } from "vitest";

import { clipBytes } from "../clipBytes";

describe("clipBytes", () => {
  it("undefined / 空文字列は空文字を返す", () => {
    expect(clipBytes(undefined, 10)).toBe("");
    expect(clipBytes("", 10)).toBe("");
  });

  it("ASCII で max バイトちょうどは切らない", () => {
    expect(clipBytes("a".repeat(10), 10)).toBe("a".repeat(10));
  });

  it("ASCII で max + 1 バイトは切る", () => {
    expect(clipBytes("a".repeat(11), 10)).toBe("a".repeat(10));
  });

  it("ASCII で max を大きく超えても max に収まる", () => {
    expect(clipBytes("a".repeat(1000), 10)).toBe("a".repeat(10));
  });

  it("CJK (3バイト/字) はバイト数で切る — UTF-16 length ではない", () => {
    // "あ" = 3 bytes (UTF-8). 4文字なら 12 バイト
    const input = "あ".repeat(4);
    const r = clipBytes(input, 9);
    // 9 バイト = 3文字分
    expect(r).toBe("あ".repeat(3));
  });

  it("文字境界でない位置で切る場合は不完全シーケンスを捨てる", () => {
    // "あ" = 3 bytes. max=4 では "あ" + 1 バイトの不完全シーケンス
    // codepoint 境界で trim するので "あ" のみが返る (3 bytes)
    const r = clipBytes("ああ", 4);
    expect(r).toBe("あ");
    expect(new TextEncoder().encode(r).byteLength).toBe(3);
  });

  it("絵文字（4バイト UTF-8 / サロゲートペア）も codepoint 境界で切る", () => {
    // 🎉 = 4 bytes (UTF-8), 2 UTF-16 code units
    const r = clipBytes("🎉🎉", 6);
    // 1個目の絵文字 (4 bytes) + 2 bytes (中途半端) → 不完全部分を捨てて1個目のみ
    expect(r).toBe("🎉");
    expect(new TextEncoder().encode(r).byteLength).toBe(4);
  });

  it("戻り値の UTF-8 byte length は必ず maxBytes 以下", () => {
    // ランダム長 CJK で再エンコードしても上限を超えないことを保証
    const inputs = [
      "あいうえお".repeat(100),
      "🎉🎊🎁".repeat(50),
      "abcd".repeat(500),
    ];
    for (const input of inputs) {
      for (const max of [1, 5, 100, 999]) {
        const r = clipBytes(input, max);
        expect(new TextEncoder().encode(r).byteLength).toBeLessThanOrEqual(max);
      }
    }
  });

  it("入力がバイト上限内なら元の文字列を返す（コピーでなく同値）", () => {
    const input = "hello world";
    expect(clipBytes(input, 100)).toBe(input);
  });
});
