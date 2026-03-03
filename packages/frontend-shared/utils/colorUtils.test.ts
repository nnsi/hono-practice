import { describe, expect, it } from "vitest";

import {
  COLOR_PALETTE,
  DEFAULT_BAR_COLOR,
  getUniqueColorForKind,
} from "./colorUtils";

describe("COLOR_PALETTE", () => {
  it("10色のカラーパレットが定義されている", () => {
    expect(COLOR_PALETTE).toHaveLength(10);
  });

  it("全て有効なHEXカラーコードである", () => {
    for (const color of COLOR_PALETTE) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("DEFAULT_BAR_COLOR", () => {
  it("デフォルトカラーが定義されている", () => {
    expect(DEFAULT_BAR_COLOR).toBe("#3b82f6");
  });
});

describe("getUniqueColorForKind", () => {
  it("パレットからカラーを返す", () => {
    const color = getUniqueColorForKind("ランニング", new Set());
    expect(COLOR_PALETTE).toContain(color);
  });

  it("同じ名前は常に同じカラーを返す（決定的）", () => {
    const usedColors = new Set<string>();
    const color1 = getUniqueColorForKind("読書", usedColors);
    const color2 = getUniqueColorForKind("読書", usedColors);
    expect(color1).toBe(color2);
  });

  it("異なる名前は異なるカラーを返すことがある", () => {
    const usedColors = new Set<string>();
    const colors = new Set<string>();
    const names = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    for (const name of names) {
      colors.add(getUniqueColorForKind(name, usedColors));
    }
    expect(colors.size).toBeGreaterThan(1);
  });

  it("使用済みカラーをスキップする", () => {
    const hashColor = getUniqueColorForKind("テスト", new Set());
    const usedColors = new Set([hashColor]);
    const newColor = getUniqueColorForKind("テスト", usedColors);
    expect(newColor).not.toBe(hashColor);
    expect(COLOR_PALETTE).toContain(newColor);
  });

  it("全色が使用済みの場合、ハッシュで決まるカラーにフォールバックする", () => {
    const allUsed = new Set(COLOR_PALETTE);
    const color = getUniqueColorForKind("何か", allUsed);
    expect(COLOR_PALETTE).toContain(color);
  });

  it("空文字でも動作する", () => {
    const color = getUniqueColorForKind("", new Set());
    expect(COLOR_PALETTE).toContain(color);
  });

  it("長い文字列でも動作する", () => {
    const longName = "あ".repeat(1000);
    const color = getUniqueColorForKind(longName, new Set());
    expect(COLOR_PALETTE).toContain(color);
  });

  it("未使用カラーがある場合、使用済みでないカラーを返す", () => {
    const usedColors = new Set(COLOR_PALETTE.slice(0, 8));
    const color = getUniqueColorForKind("テスト名", usedColors);
    expect(usedColors.has(color)).toBe(false);
  });
});
