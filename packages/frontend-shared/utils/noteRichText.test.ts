import { describe, expect, test } from "vitest";

import {
  looksLikeNoteMarkdown,
  markdownToNoteEditorHtml,
  markdownToNotePasteHtml,
  markdownToNotePreviewText,
  matchNoteBlockMarkdownShortcut,
  noteEditorHtmlToMarkdown,
  parseNoteRichTextEditorMessage,
} from "./noteRichText";

describe("noteRichText", () => {
  test("markdownをeditor htmlへ変換できる", () => {
    const html = markdownToNoteEditorHtml(
      "# Title\n\n**bold** and *italic* and `code`\n\n- one\n- two\n\n| A | B |\n| --- | --- |\n| one | two |",
    );

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
  });

  test("editor htmlをmarkdownへ戻せる", () => {
    const markdown = noteEditorHtmlToMarkdown(
      "<h2>Heading</h2><p><strong>bold</strong> <code>text</code></p><blockquote><p>quote</p></blockquote><ol><li>one</li><li>two</li></ol><pre><code>const x = 1;\nconsole.log(x);\n</code></pre><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>one</td><td>two</td></tr></tbody></table>",
    );

    expect(markdown).toContain("## Heading");
    expect(markdown).toContain("**bold** `text`");
    expect(markdown).toContain("> quote");
    expect(markdown).toContain("1. one");
    expect(markdown).toContain("```");
    expect(markdown).toContain("const x = 1;");
    expect(markdown).toMatch(/\| A\s+\| B\s+\|/);
    expect(markdown).toMatch(/\| one \| two \|/);
  });

  test("不要なhtmlはmarkdown保存前に落とす", () => {
    const markdown = noteEditorHtmlToMarkdown(
      '<p>Hello\u200B<script>alert("x")</script><span style="color:red"> world</span></p>',
    );

    expect(markdown).toBe("Hello world");
  });

  test("GFM tableをmarkdownとして往復できる", () => {
    const source = [
      "| Name | Value |",
      "| --- | --- |",
      "| alpha | 1 |",
      "| beta | 2 |",
    ].join("\n");

    const html = markdownToNoteEditorHtml(source);
    const markdown = noteEditorHtmlToMarkdown(html);

    expect(html).toContain("<table>");
    expect(html).toContain("<td>alpha</td>");
    expect(markdown).toMatch(/\| Name\s+\| Value\s+\|/);
    expect(markdown).toMatch(/\| alpha \| 1\s+\|/);
    expect(markdown).toMatch(/\| beta\s+\| 2\s+\|/);
  });

  test("code blockをmarkdownとして往復できる", () => {
    const source = "```\nconst x = 1;\nconsole.log(x);\n```";

    const html = markdownToNoteEditorHtml(source);
    const markdown = noteEditorHtmlToMarkdown(html);

    expect(html).toContain("<pre><code>const x = 1;");
    expect(markdown).toContain("```");
    expect(markdown).toContain("console.log(x);");
  });

  test("markdownから一覧表示向けのpreview textを作れる", () => {
    const preview = markdownToNotePreviewText(
      "# Title\n\n- one\n- two\n\n**bold** text",
    );

    expect(preview).toBe("Title one two bold text");
  });

  test("editor内の単純改行をmarkdownのhard breakとして保存できる", () => {
    const markdown = noteEditorHtmlToMarkdown("<p>a<br>b</p>");

    expect(markdown).toBe("a\\\nb");
    expect(markdownToNoteEditorHtml(markdown)).toContain("<br>");
  });

  test("引用内の単純改行をblank lineではなくhard breakとして保存できる", () => {
    const markdown = noteEditorHtmlToMarkdown(
      "<blockquote>a<br>b</blockquote>",
    );

    expect(markdown).toBe("> a\\\n> b");
  });

  test("paste用に単一段落のplain textは<p>を外してinline挿入できる形にする", () => {
    expect(markdownToNotePasteHtml("hello world")).toBe("hello world");
    expect(markdownToNotePasteHtml("**bold**")).toBe("<strong>bold</strong>");
    expect(markdownToNotePasteHtml("`code`")).toBe("<code>code</code>");
    expect(markdownToNotePasteHtml("")).toBe("");
  });

  test("paste用にmarkdown構文を含むテキストはブロック要素のHTMLとして返す", () => {
    const html = markdownToNotePasteHtml("# Title\n\n- one\n- two");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<ul>");
  });

  test("paste用にtableとcode blockをブロック要素のHTMLとして返す", () => {
    const tableHtml = markdownToNotePasteHtml(
      "| A | B |\n| --- | --- |\n| one | two |",
    );
    const codeHtml = markdownToNotePasteHtml("```\nconst x = 1;\n```");

    expect(tableHtml).toContain("<table>");
    expect(tableHtml).toContain("<td>one</td>");
    expect(codeHtml).toContain("<pre><code>const x = 1;");
  });

  test("paste用に複数段落のplain textはそのまま<p>を保持する", () => {
    const html = markdownToNotePasteHtml("first para\n\nsecond para");
    expect(html).toContain("<p>first para</p>");
    expect(html).toContain("<p>second para</p>");
  });

  test("plain textがMarkdown構文を含むかを判定できる", () => {
    expect(looksLikeNoteMarkdown("# Title")).toBe(true);
    expect(looksLikeNoteMarkdown("## Heading")).toBe(true);
    expect(looksLikeNoteMarkdown("- item")).toBe(true);
    expect(looksLikeNoteMarkdown("* item")).toBe(true);
    expect(looksLikeNoteMarkdown("1. item")).toBe(true);
    expect(looksLikeNoteMarkdown("> quote")).toBe(true);
    expect(looksLikeNoteMarkdown("text with **bold** inline")).toBe(true);
    expect(looksLikeNoteMarkdown("text with `code` inline")).toBe(true);
    expect(looksLikeNoteMarkdown("see [link](https://example.com)")).toBe(true);
    expect(looksLikeNoteMarkdown("```\ncode\n```")).toBe(true);
    expect(
      looksLikeNoteMarkdown("| A | B |\n| --- | --- |\n| one | two |"),
    ).toBe(true);
    expect(looksLikeNoteMarkdown("plain text with | pipe")).toBe(false);
    expect(looksLikeNoteMarkdown("just plain text with no markers")).toBe(
      false,
    );
    expect(looksLikeNoteMarkdown("")).toBe(false);
    expect(looksLikeNoteMarkdown("a*b*c")).toBe(false);
  });

  test("paste-requestメッセージをparseできる", () => {
    const parsed = parseNoteRichTextEditorMessage(
      JSON.stringify({
        source: "note-rich-text-editor",
        type: "paste-request",
        text: "# Hello",
      }),
    );
    expect(parsed).toEqual({
      source: "note-rich-text-editor",
      type: "paste-request",
      text: "# Hello",
    });
  });

  test("block先頭のmarkdown shortcutを判定できる", () => {
    expect(matchNoteBlockMarkdownShortcut("#")).toBe("heading1");
    expect(matchNoteBlockMarkdownShortcut("# Title")).toBe("heading1");
    expect(matchNoteBlockMarkdownShortcut("-")).toBe("bulletList");
    expect(matchNoteBlockMarkdownShortcut("- item")).toBe("bulletList");
    expect(matchNoteBlockMarkdownShortcut("1. item")).toBe("orderedList");
    expect(matchNoteBlockMarkdownShortcut(">")).toBe("blockquote");
    expect(matchNoteBlockMarkdownShortcut("> quote")).toBe("blockquote");
    expect(matchNoteBlockMarkdownShortcut("```")).toBe("codeBlock");
    expect(matchNoteBlockMarkdownShortcut("##")).toBeNull();
    expect(matchNoteBlockMarkdownShortcut("text")).toBeNull();
  });
});
