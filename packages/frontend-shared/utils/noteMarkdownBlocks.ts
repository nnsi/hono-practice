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

const INLINE_TOKEN_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

export function parseNoteMarkdownInline(text: string): NoteInlineSpan[] {
  const spans: NoteInlineSpan[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE_TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, index) });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      spans.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith("`")) {
      spans.push({ text: token.slice(1, -1), code: true });
    } else {
      spans.push({ text: token.slice(1, -1), italic: true });
    }
    lastIndex = index + token.length;
  }
  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex) });
  }
  return spans;
}

export function parseNoteMarkdownBlocks(markdown: string): NoteMarkdownBlock[] {
  const blocks: NoteMarkdownBlock[] = [];
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = /^(#{1,2})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: heading[1].length === 1 ? "heading1" : "heading2",
        spans: parseNoteMarkdownInline(heading[2]),
      });
      continue;
    }

    const blockquote = /^>\s+(.*)$/.exec(line);
    if (blockquote) {
      blocks.push({
        type: "blockquote",
        spans: parseNoteMarkdownInline(blockquote[1]),
      });
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      blocks.push({
        type: "bullet",
        spans: parseNoteMarkdownInline(bullet[1]),
      });
      continue;
    }

    const ordered = /^(\d+)\.\s+(.*)$/.exec(line);
    if (ordered) {
      blocks.push({
        type: "ordered",
        number: Number(ordered[1]),
        spans: parseNoteMarkdownInline(ordered[2]),
      });
      continue;
    }

    blocks.push({ type: "paragraph", spans: parseNoteMarkdownInline(line) });
  }
  return blocks;
}

const TITLE_MAX_LENGTH = 60;

/**
 * 本文の最初の非空行からタイトルを導出する（タイトル未入力時の自動補完用）。
 * markdown の行頭マーカーと強調記号を取り除いた plain text を返す。
 */
export function deriveNoteTitleFromContent(markdown: string): string {
  const firstLine =
    markdown
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line !== "") ?? "";

  const stripped = firstLine
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^>\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();

  return stripped.slice(0, TITLE_MAX_LENGTH);
}
