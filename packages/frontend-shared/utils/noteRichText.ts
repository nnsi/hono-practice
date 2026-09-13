import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

export const NOTE_RICH_TEXT_EDITOR_SOURCE = "note-rich-text-editor";
const EMPTY_EDITOR_HTML = "<p><br></p>";

export type NoteRichTextCommand =
  | "bold"
  | "italic"
  | "heading1"
  | "heading2"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "codeBlock"
  | "clear";

export type NoteRichTextLabels = {
  bold: string;
  italic: string;
  heading1: string;
  heading2: string;
  bulletList: string;
  orderedList: string;
  blockquote: string;
  clear: string;
};

export type NoteRichTextEditorMessage =
  | {
      source: typeof NOTE_RICH_TEXT_EDITOR_SOURCE;
      type: "ready";
    }
  | {
      source: typeof NOTE_RICH_TEXT_EDITOR_SOURCE;
      type: "change";
      html: string;
    }
  | {
      source: typeof NOTE_RICH_TEXT_EDITOR_SOURCE;
      type: "height";
      height: number;
    }
  | {
      source: typeof NOTE_RICH_TEXT_EDITOR_SOURCE;
      type: "paste-request";
      text: string;
    };

type CreateNoteRichTextEditorDocumentOptions = {
  placeholder: string;
  labels: NoteRichTextLabels;
  isDark?: boolean;
  scriptUrl: string;
};

const noteEditorSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "h1",
    "h2",
    "blockquote",
    "pre",
    "code",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
};

const markdownToHtmlProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, {
    handlers: {
      // Mobile notes contain ordinary newlines. Render these like hard breaks
      // in prose; code blocks and inline code use their own Markdown handlers.
      text(_state, node: { value: string }) {
        return node.value.split(/\r\n|\r|\n/).flatMap((value, index) => {
          const text = { type: "text" as const, value };
          return index === 0
            ? [text]
            : [
                {
                  type: "element" as const,
                  tagName: "br",
                  properties: {},
                  children: [],
                },
                text,
              ];
        });
      },
    },
  })
  .use(rehypeSanitize, noteEditorSchema)
  .use(rehypeStringify);

const htmlToMarkdownProcessor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, noteEditorSchema)
  .use(rehypeRemark)
  .use(remarkGfm)
  .use(remarkStringify, {
    bullet: "-",
    emphasis: "*",
    fences: true,
    listItemIndent: "one",
    strong: "*",
  });

const buttonOrder: Array<{
  command: NoteRichTextCommand;
  labelKey: keyof NoteRichTextLabels;
}> = [
  { command: "bold", labelKey: "bold" },
  { command: "italic", labelKey: "italic" },
  { command: "heading1", labelKey: "heading1" },
  { command: "heading2", labelKey: "heading2" },
  { command: "bulletList", labelKey: "bulletList" },
  { command: "orderedList", labelKey: "orderedList" },
  { command: "blockquote", labelKey: "blockquote" },
  { command: "clear", labelKey: "clear" },
];

const markdownShortcutEntries: Array<{
  trigger: string;
  command: NoteRichTextCommand;
}> = [
  { trigger: "#", command: "heading1" },
  { trigger: "-", command: "bulletList" },
  { trigger: ">", command: "blockquote" },
  { trigger: "```", command: "codeBlock" },
];

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeEditorHtml(html: string) {
  return html
    .replaceAll("\u200B", "")
    .replaceAll("&nbsp;", " ")
    .replace(/<\/?span[^>]*>/g, "")
    .replace(/<div(?=[\s>])/g, "<p")
    .replace(/<\/div>/g, "</p>")
    .trim();
}

function normalizeMarkdown(markdown: string) {
  return markdown
    .replaceAll("\u00a0", " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(text: string) {
  return text
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

const markdownDetectionPatterns: RegExp[] = [
  /^\s{0,3}#{1,6} /m,
  /^\s{0,3}[-*+] /m,
  /^\s{0,3}\d+\. /m,
  /^\s{0,3}> /m,
  /```/,
  /^\s*\|?.+\|.+\n\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/m,
  /`[^`\n]+`/,
  /\*\*[^*\n]+\*\*/,
  /(^|\s)\*[^*\s][^*\n]*\*(\s|$)/,
  /\[[^\]\n]+\]\([^)\n]+\)/,
];

export function looksLikeNoteMarkdown(text: string) {
  if (!text) return false;
  return markdownDetectionPatterns.some((pattern) => pattern.test(text));
}

export function matchNoteBlockMarkdownShortcut(text: string) {
  const normalized = text.replaceAll("\u00a0", " ").trimEnd();
  if (/^#{1}\s+.+/.test(normalized)) return "heading1";
  if (/^#{2}\s+.+/.test(normalized)) return "heading2";
  if (/^[-*+]\s+.+/.test(normalized)) return "bulletList";
  if (/^\d+\.\s+.+/.test(normalized)) return "orderedList";
  if (/^>\s+.+/.test(normalized)) return "blockquote";
  if (/^```/.test(normalized)) return "codeBlock";
  const matchedShortcut = markdownShortcutEntries.find(
    ({ trigger }) => trigger === normalized,
  );
  return matchedShortcut?.command ?? null;
}

export function markdownToNoteEditorHtml(markdown: string) {
  const normalized = normalizeMarkdown(markdown);
  if (!normalized) {
    return EMPTY_EDITOR_HTML;
  }

  const html = markdownToHtmlProcessor
    .processSync(normalized)
    .toString()
    .trim();
  return html || EMPTY_EDITOR_HTML;
}

export function noteEditorHtmlToMarkdown(html: string) {
  const normalized = normalizeEditorHtml(html);
  if (!normalized) {
    return "";
  }

  const markdown = htmlToMarkdownProcessor.processSync(normalized).toString();
  return normalizeMarkdown(markdown);
}

export function markdownToNotePasteHtml(text: string) {
  const html = markdownToNoteEditorHtml(text);
  if (html === EMPTY_EDITOR_HTML) {
    return "";
  }

  const trimmed = html.trim();
  const singleParagraph = /^<p>([\s\S]*)<\/p>$/.exec(trimmed);
  if (singleParagraph) {
    const inner = singleParagraph[1];
    if (!/<(p|h1|h2|h3|ul|ol|li|blockquote|pre)(\s|>)/i.test(inner)) {
      return inner;
    }
  }
  return trimmed;
}

export function markdownToNotePreviewText(markdown: string) {
  const html = markdownToNoteEditorHtml(markdown);
  if (html === EMPTY_EDITOR_HTML) {
    return "";
  }

  return decodeHtmlEntities(
    html
      .replace(/<li>/g, " ")
      .replace(/<\/(p|h1|h2|li|blockquote)>/g, " ")
      .replace(/<br\s*\/?>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function parseNoteRichTextEditorMessage(
  raw: unknown,
): NoteRichTextEditorMessage | null {
  try {
    const candidate = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const parsed = candidate as Record<string, unknown>;

    if (
      parsed.source !== NOTE_RICH_TEXT_EDITOR_SOURCE ||
      typeof parsed.type !== "string"
    ) {
      return null;
    }

    if (parsed.type === "ready") {
      return {
        source: NOTE_RICH_TEXT_EDITOR_SOURCE,
        type: "ready",
      };
    }

    if (parsed.type === "change" && typeof parsed.html === "string") {
      return {
        source: NOTE_RICH_TEXT_EDITOR_SOURCE,
        type: "change",
        html: parsed.html,
      };
    }

    if (parsed.type === "height" && typeof parsed.height === "number") {
      return {
        source: NOTE_RICH_TEXT_EDITOR_SOURCE,
        type: "height",
        height: parsed.height,
      };
    }

    if (parsed.type === "paste-request" && typeof parsed.text === "string") {
      return {
        source: NOTE_RICH_TEXT_EDITOR_SOURCE,
        type: "paste-request",
        text: parsed.text,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function createNoteRichTextEditorDocument({
  placeholder,
  labels,
  isDark = false,
  scriptUrl,
}: CreateNoteRichTextEditorDocumentOptions) {
  const palette = isDark
    ? {
        background: "#111827",
        border: "#374151",
        editorBackground: "#111827",
        text: "#f3f4f6",
        muted: "#9ca3af",
        buttonBackground: "#1f2937",
        buttonText: "#f3f4f6",
        buttonBorder: "#4b5563",
        buttonHover: "#374151",
        quoteBorder: "#60a5fa",
        quoteBackground: "#0f172a",
        codeBackground: "#020617",
      }
    : {
        background: "#ffffff",
        border: "#e5e7eb",
        editorBackground: "#ffffff",
        text: "#111827",
        muted: "#9ca3af",
        buttonBackground: "#f9fafb",
        buttonText: "#111827",
        buttonBorder: "#d1d5db",
        buttonHover: "#f3f4f6",
        quoteBorder: "#93c5fd",
        quoteBackground: "#eff6ff",
        codeBackground: "#f3f4f6",
      };

  const toolbarButtons = buttonOrder
    .map(({ command, labelKey }) => {
      const label = labels[labelKey];
      return `<button class="toolbar-button" type="button" data-command="${command}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
    })
    .join("");

  const config = JSON.stringify({
    emptyHtml: EMPTY_EDITOR_HTML,
    markdownShortcuts: markdownShortcutEntries,
    markdownDetectionPatterns: markdownDetectionPatterns.map((pattern) => ({
      source: pattern.source,
      flags: pattern.flags,
    })),
    source: NOTE_RICH_TEXT_EDITOR_SOURCE,
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      :root {
        color-scheme: ${isDark ? "dark" : "light"};
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: transparent;
        color: ${palette.text};
        font-family:
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      body {
        overflow: hidden;
      }

      .shell {
        background: transparent;
      }

      .toolbar {
        display: none;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px;
        border-bottom: 1px solid ${palette.border};
        background: ${palette.background};
      }

      .toolbar-button {
        border: 1px solid ${palette.buttonBorder};
        background: ${palette.buttonBackground};
        color: ${palette.buttonText};
        border-radius: 9999px;
        padding: 8px 12px;
        font-size: 13px;
        line-height: 1;
        cursor: pointer;
      }

      .toolbar-button:hover {
        background: ${palette.buttonHover};
      }

      #editor {
        min-height: 280px;
        padding: 18px 16px 20px;
        background: ${palette.editorBackground};
        color: ${palette.text};
        font-size: 16px;
        line-height: 1.7;
        outline: none;
        position: relative;
        word-break: break-word;
      }

      #editor[data-empty="true"]::before {
        content: attr(data-placeholder);
        color: ${palette.muted};
        position: absolute;
        inset: 18px 16px auto;
        pointer-events: none;
      }

      #editor > *:first-child {
        margin-top: 0;
      }

      #editor > *:last-child {
        margin-bottom: 0;
      }

      #editor p {
        margin: 0 0 1em;
      }

      #editor h1,
      #editor h2 {
        line-height: 1.2;
        margin: 0 0 0.75em;
      }

      #editor h1 {
        font-size: 1.5rem;
      }

      #editor h2 {
        font-size: 1.25rem;
      }

      #editor ul,
      #editor ol {
        margin: 0 0 1em;
        padding-left: 1.5em;
      }

      #editor li + li {
        margin-top: 0.25em;
      }

      #editor blockquote {
        border-left: 4px solid ${palette.quoteBorder};
        background: ${palette.quoteBackground};
        margin: 0 0 1em;
        padding: 0.75em 1em;
        border-radius: 0 12px 12px 0;
      }

      #editor pre {
        margin: 0 0 1em;
        padding: 0.875em 1em;
        border-radius: 16px;
        background: ${palette.codeBackground};
        overflow-x: auto;
        white-space: pre-wrap;
      }

      #editor pre code {
        display: block;
        font-family:
          ui-monospace,
          SFMono-Regular,
          SFMono-Regular,
          Menlo,
          Monaco,
          Consolas,
          "Liberation Mono",
          "Courier New",
          monospace;
        font-size: 0.9375rem;
      }

      #editor :not(pre) > code {
        border-radius: 6px;
        background: ${palette.codeBackground};
        padding: 0.1em 0.35em;
        font-family:
          ui-monospace,
          SFMono-Regular,
          Menlo,
          Monaco,
          Consolas,
          "Liberation Mono",
          "Courier New",
          monospace;
        font-size: 0.92em;
      }

      #editor table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 1em;
        font-size: 0.95rem;
      }

      #editor th,
      #editor td {
        border: 1px solid ${palette.border};
        padding: 0.5em 0.65em;
        text-align: left;
        vertical-align: top;
      }

      #editor th {
        background: ${palette.buttonBackground};
        font-weight: 700;
      }

      #editor strong {
        font-weight: 700;
      }

      #editor em {
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="toolbar">${toolbarButtons}</div>
      <div id="editor" contenteditable="false" spellcheck="true" data-empty="true" data-placeholder="${escapeHtml(placeholder)}"></div>
    </div>
    <script src="${escapeHtml(scriptUrl)}" data-config="${escapeHtml(config)}"></script>
  </body>
</html>`;
}
