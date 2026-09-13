import { parseNoteMarkdown } from "./noteMarkdown";

export type NoteInlineSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

export type NoteMarkdownBlock =
  | {
      type: "heading1" | "heading2" | "blockquote" | "paragraph" | "bullet";
      spans: NoteInlineSpan[];
    }
  | { type: "ordered"; number: number; spans: NoteInlineSpan[] };

type MarkdownNode = ReturnType<typeof parseNoteMarkdown>["children"][number];
type InlineStyle = Omit<NoteInlineSpan, "text">;

function inlineSpans(
  node: MarkdownNode,
  style: InlineStyle = {},
): NoteInlineSpan[] {
  switch (node.type) {
    case "text":
      return [{ text: node.value.replace(/\r\n|\r/g, "\n"), ...style }];
    case "break":
      return [{ text: "\n", ...style }];
    case "inlineCode":
    case "code":
      return [{ text: node.value, ...style, code: true }];
    case "strong":
      return node.children.flatMap((child) =>
        inlineSpans(child, { ...style, bold: true }),
      );
    case "emphasis":
      return node.children.flatMap((child) =>
        inlineSpans(child, { ...style, italic: true }),
      );
    case "image":
      return [{ text: node.alt ?? "", ...style }];
    default:
      return "children" in node
        ? node.children.flatMap((child) => inlineSpans(child, style))
        : [];
  }
}

export function parseNoteMarkdownInline(text: string): NoteInlineSpan[] {
  return parseNoteMarkdown(text).children.flatMap((node) => inlineSpans(node));
}

export function parseNoteMarkdownBlocks(markdown: string): NoteMarkdownBlock[] {
  const blocks: NoteMarkdownBlock[] = [];
  function visit(node: MarkdownNode, context?: "blockquote") {
    if (node.type === "list") {
      node.children.forEach((item, index) => {
        const [first, ...rest] = item.children;
        if (first) {
          const spans = inlineSpans(first);
          blocks.push(
            node.ordered
              ? { type: "ordered", number: (node.start ?? 1) + index, spans }
              : { type: "bullet", spans },
          );
        }
        rest.forEach((child) => visit(child, context));
      });
    } else if (node.type === "blockquote") {
      node.children.forEach((child) => visit(child, "blockquote"));
    } else if (node.type === "heading") {
      blocks.push({
        type: node.depth === 1 ? "heading1" : "heading2",
        spans: inlineSpans(node),
      });
    } else if (node.type === "paragraph" || node.type === "code") {
      blocks.push({ type: context ?? "paragraph", spans: inlineSpans(node) });
    } else if (node.type === "table") {
      node.children.forEach((row) => {
        const spans = row.children.flatMap((cell, index) => [
          ...(index ? [{ text: " | " }] : []),
          ...inlineSpans(cell),
        ]);
        blocks.push({ type: "paragraph", spans });
      });
    }
  }
  parseNoteMarkdown(markdown).children.forEach((node) => visit(node));
  return blocks;
}

const TITLE_MAX_LENGTH = 60;

/**
 * 本文の最初の非空行からタイトルを導出する（タイトル未入力時の自動補完用）。
 * markdown の行頭マーカーと強調記号を取り除いた plain text を返す。
 */
export function deriveNoteTitleFromContent(markdown: string): string {
  const firstBlock = parseNoteMarkdownBlocks(markdown)[0];
  const firstLine =
    firstBlock?.spans
      .map((span) => span.text)
      .join("")
      .split("\n")[0] ?? "";
  return firstLine.trim().slice(0, TITLE_MAX_LENGTH);
}
