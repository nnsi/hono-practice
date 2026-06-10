import { describe, expect, it } from "vitest";

import {
  deriveNoteTitleFromContent,
  parseNoteMarkdownBlocks,
  parseNoteMarkdownInline,
} from "./noteMarkdownBlocks";

describe("parseNoteMarkdownInline", () => {
  it("プレーンテキストは単一spanになる", () => {
    expect(parseNoteMarkdownInline("hello world")).toEqual([
      { text: "hello world" },
    ]);
  });

  it("bold / italic / code を分解する", () => {
    expect(parseNoteMarkdownInline("a **b** c *d* e `f`")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " c " },
      { text: "d", italic: true },
      { text: " e " },
      { text: "f", code: true },
    ]);
  });
});

describe("parseNoteMarkdownBlocks", () => {
  it("見出し・リスト・引用・段落を分類する", () => {
    const blocks = parseNoteMarkdownBlocks(
      "# Title\n\n## Sub\n\n- one\n2. two\n> quote\n\nplain",
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "heading1",
      "heading2",
      "bullet",
      "ordered",
      "blockquote",
      "paragraph",
    ]);
  });

  it("ordered list は番号を保持する", () => {
    const blocks = parseNoteMarkdownBlocks("1. first\n2. second");
    expect(blocks).toEqual([
      { type: "ordered", number: 1, spans: [{ text: "first" }] },
      { type: "ordered", number: 2, spans: [{ text: "second" }] },
    ]);
  });

  it("空文字列は空配列を返す", () => {
    expect(parseNoteMarkdownBlocks("")).toEqual([]);
    expect(parseNoteMarkdownBlocks("\n\n  \n")).toEqual([]);
  });

  it("見出し内のインライン強調も分解する", () => {
    expect(parseNoteMarkdownBlocks("# Hello **World**")).toEqual([
      {
        type: "heading1",
        spans: [{ text: "Hello " }, { text: "World", bold: true }],
      },
    ]);
  });
});

describe("deriveNoteTitleFromContent", () => {
  it("最初の非空行を返す", () => {
    expect(deriveNoteTitleFromContent("\n\nfirst line\nsecond")).toBe(
      "first line",
    );
  });

  it("行頭マーカーと強調記号を取り除く", () => {
    expect(deriveNoteTitleFromContent("# **Morning** plan")).toBe(
      "Morning plan",
    );
    expect(deriveNoteTitleFromContent("- `item` one")).toBe("item one");
    expect(deriveNoteTitleFromContent("> 引用メモ")).toBe("引用メモ");
    expect(deriveNoteTitleFromContent("3. third *thing*")).toBe("third thing");
  });

  it("空コンテンツは空文字列を返す", () => {
    expect(deriveNoteTitleFromContent("")).toBe("");
    expect(deriveNoteTitleFromContent("\n \n")).toBe("");
  });

  it("60文字に切り詰める", () => {
    const long = "あ".repeat(100);
    expect(deriveNoteTitleFromContent(long)).toHaveLength(60);
  });
});
