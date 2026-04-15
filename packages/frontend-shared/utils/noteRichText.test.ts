import { describe, expect, test } from "vitest";

import {
  markdownToNoteEditorHtml,
  markdownToNotePreviewText,
  noteEditorHtmlToMarkdown,
} from "./noteRichText";

describe("noteRichText", () => {
  test("markdownをeditor htmlへ変換できる", () => {
    const html = markdownToNoteEditorHtml(
      "# Title\n\n**bold** and *italic*\n\n- one\n- two",
    );

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<ul>");
  });

  test("editor htmlをmarkdownへ戻せる", () => {
    const markdown = noteEditorHtmlToMarkdown(
      "<h2>Heading</h2><p><strong>bold</strong> text</p><blockquote><p>quote</p></blockquote><ol><li>one</li><li>two</li></ol>",
    );

    expect(markdown).toContain("## Heading");
    expect(markdown).toContain("**bold** text");
    expect(markdown).toContain("> quote");
    expect(markdown).toContain("1. one");
  });

  test("不要なhtmlはmarkdown保存前に落とす", () => {
    const markdown = noteEditorHtmlToMarkdown(
      '<p>Hello<script>alert("x")</script><span style="color:red"> world</span></p>',
    );

    expect(markdown).toBe("Hello world");
  });

  test("markdownから一覧表示向けのpreview textを作れる", () => {
    const preview = markdownToNotePreviewText(
      "# Title\n\n- one\n- two\n\n**bold** text",
    );

    expect(preview).toBe("Title one two bold text");
  });
});
