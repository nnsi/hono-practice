import { describe, expect, it } from "vitest";

import {
  deriveNoteTitleFromContent,
  parseNoteMarkdownBlocks,
  parseNoteMarkdownInline,
} from "./noteMarkdownBlocks";
import {
  markdownToNoteEditorHtml,
  noteEditorHtmlToMarkdown,
} from "./noteRichText";

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

describe("Web / Mobile Markdown interoperability", () => {
  function text(markdown: string) {
    return parseNoteMarkdownBlocks(markdown)
      .map((block) => block.spans.map((span) => span.text).join(""))
      .join("\n\n");
  }

  it.each([
    "first\nsecond",
    "first\\\nsecond",
    "first  \nsecond",
    "first\r\nsecond",
  ])("ordinary and standard hard breaks render equally: %j", (markdown) =>
    expect(text(markdown)).toBe("first\nsecond"));

  it("decodes escaped punctuation without stripping literal backslashes or code", () => {
    expect(
      text("literal \\\\ and \\*stars\\*\n`C:\\temp\\`\n\n```\na\\\nb\n```"),
    ).toBe("literal \\ and *stars*\nC:\\temp\\\n\na\\\nb");
  });

  it("handles nested emphasis, multiline list items and blockquotes", () => {
    expect(text("- **first**\\\n  second\n\n> quoted\\\n> line")).toBe(
      "first\nsecond\n\nquoted\nline",
    );
    expect(parseNoteMarkdownInline("***nested***")).toEqual([
      { text: "nested", bold: true, italic: true },
    ]);
  });

  it("keeps rendered content stable across repeated Web saves and Mobile edits", () => {
    let markdown =
      "first\nsecond\n\nliteral \\\\ and \\*stars\\*\n\n```\na\\\nb\n```";
    const original = text(markdown);
    for (let index = 0; index < 3; index++) {
      markdown = noteEditorHtmlToMarkdown(markdownToNoteEditorHtml(markdown));
      expect(text(markdown)).toBe(original);
    }
    markdown += "\n\nMobile edit\nnext line";
    expect(
      text(noteEditorHtmlToMarkdown(markdownToNoteEditorHtml(markdown))),
    ).toBe(`${original}\n\nMobile edit\nnext line`);
  });

  it("derives titles from parsed text, without a hard-break escape", () => {
    expect(deriveNoteTitleFromContent("first\\\nsecond")).toBe("first");
    expect(deriveNoteTitleFromContent("\\*literal\\*")).toBe("*literal*");
  });
});
