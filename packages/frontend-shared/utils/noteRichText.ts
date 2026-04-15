import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

export const NOTE_RICH_TEXT_EDITOR_SOURCE = "note-rich-text-editor";
const EMPTY_EDITOR_HTML = "<p></p>";

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
    };

type CreateNoteRichTextEditorDocumentOptions = {
  placeholder: string;
  labels: NoteRichTextLabels;
  isDark?: boolean;
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
  ],
};

const markdownToHtmlProcessor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSanitize, noteEditorSchema)
  .use(rehypeStringify);

const htmlToMarkdownProcessor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, noteEditorSchema)
  .use(rehypeRemark)
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

export function matchNoteBlockMarkdownShortcut(text: string) {
  const normalized = text.replaceAll("\u00a0", " ");
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
  } catch {
    return null;
  }

  return null;
}

export function createNoteRichTextEditorDocument({
  placeholder,
  labels,
  isDark = false,
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
        display: flex;
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
      <div id="editor" contenteditable="true" spellcheck="true" data-empty="true" data-placeholder="${escapeHtml(placeholder)}"></div>
    </div>
    <script>
      (() => {
        const config = ${config};
        const editor = document.getElementById("editor");
        const toolbar = document.querySelector(".toolbar");
        const shell = document.querySelector(".shell");
        let applyingExternalUpdate = false;
        let lastSentHtml = "";
        let lastSentHeight = 0;

        const postMessage = (payload) => {
          const serialized = JSON.stringify({ source: config.source, ...payload });
          if (window.ReactNativeWebView?.postMessage) {
            window.ReactNativeWebView.postMessage(serialized);
          }
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(serialized, "*");
          }
        };

        const updateEmptyState = () => {
          const text = editor.textContent?.replace(/\\u200B/g, "").trim() ?? "";
          editor.dataset.empty = text.length === 0 ? "true" : "false";
        };

        const ensureEditorHtml = () => {
          if (!editor.innerHTML.trim()) {
            editor.innerHTML = config.emptyHtml;
          }
          updateEmptyState();
        };

        const reportHeight = () => {
          const shellHeight =
            shell instanceof HTMLElement
              ? Math.ceil(shell.getBoundingClientRect().height)
              : 0;
          const toolbarHeight =
            toolbar instanceof HTMLElement
              ? Math.ceil(toolbar.getBoundingClientRect().height)
              : 0;
          const editorHeight = Math.ceil(editor.scrollHeight);
          const nextHeight = Math.max(
            shellHeight,
            toolbarHeight + editorHeight,
            340,
          );
          if (Math.abs(nextHeight - lastSentHeight) > 1) {
            lastSentHeight = nextHeight;
            postMessage({ type: "height", height: nextHeight });
          }
        };

        const emitChange = () => {
          ensureEditorHtml();
          if (applyingExternalUpdate) {
            reportHeight();
            return;
          }

          const nextHtml = editor.innerHTML;
          if (nextHtml !== lastSentHtml) {
            lastSentHtml = nextHtml;
            postMessage({ type: "change", html: nextHtml });
          }
          reportHeight();
        };

        const focusEditor = () => {
          editor.focus();
        };

        const setCaret = (node, offset = 0) => {
          const selection = document.getSelection();
          if (!selection) return;

          const range = document.createRange();
          range.setStart(node, offset);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          focusEditor();
        };

        const formatBlock = (tagName) => {
          document.execCommand("formatBlock", false, "<" + tagName + ">");
        };

        const toggleBlock = (tagName) => {
          const selection = document.getSelection();
          const anchorNode = selection?.anchorNode;
          const parentElement =
            anchorNode?.nodeType === Node.ELEMENT_NODE
              ? anchorNode
              : anchorNode?.parentElement;
          const currentBlock = parentElement?.closest(tagName);
          formatBlock(currentBlock ? "p" : tagName);
        };

        const clearFormatting = () => {
          document.execCommand("removeFormat");
          document.execCommand("unlink");
          formatBlock("p");
        };

        const insertLineBreak = () => {
          document.execCommand("insertLineBreak");
        };

        const insertParagraphAfterBlock = (block, range) => {
          const trailingRange = document.createRange();
          trailingRange.selectNodeContents(block);
          trailingRange.setStart(range.startContainer, range.startOffset);
          const trailingFragment = trailingRange.extractContents();

          const paragraph = document.createElement("p");
          if (trailingFragment.childNodes.length > 0) {
            paragraph.appendChild(trailingFragment);
          } else {
            paragraph.appendChild(document.createElement("br"));
          }

          block.after(paragraph);
          setCaret(paragraph, 0);
        };

        const trimTrailingBreaks = (element) => {
          while (element.lastChild instanceof HTMLBRElement) {
            element.lastChild.remove();
          }
        };

        const exitBlockquote = (blockquote, range) => {
          insertParagraphAfterBlock(blockquote, range);
          trimTrailingBreaks(blockquote);
          if (!blockquote.textContent?.replace(/\\u200B/g, "").trim()) {
            blockquote.remove();
          }
        };

        const getCurrentBlockContext = () => {
          const selection = document.getSelection();
          if (!selection || !selection.rangeCount || !selection.isCollapsed) {
            return null;
          }

          const range = selection.getRangeAt(0);
          const anchorNode = selection.anchorNode;
          const parentElement =
            anchorNode?.nodeType === Node.ELEMENT_NODE
              ? anchorNode
              : anchorNode?.parentElement;
          const block = parentElement?.closest("p, h1, h2, blockquote, li");
          if (!(block instanceof HTMLElement)) {
            return null;
          }

          return { block, range };
        };

        const getMarkdownShortcutCommand = (text) => {
          const matchedShortcut = config.markdownShortcuts.find(
            (shortcut) => shortcut.trigger === text.replace(/\\u00a0/g, " "),
          );
          return matchedShortcut?.command ?? null;
        };

        const isCurrentBlockquoteLineEmpty = (blockquote, range) => {
          const beforeCaret = document.createRange();
          beforeCaret.selectNodeContents(blockquote);
          beforeCaret.setEnd(range.endContainer, range.endOffset);

          const container = document.createElement("div");
          container.appendChild(beforeCaret.cloneContents());
          const html = container.innerHTML
            .replace(/<\\/?span[^>]*>/g, "")
            .replaceAll("&nbsp;", " ");
          const lastBreakIndex = html.toLowerCase().lastIndexOf("<br>");
          const currentLineHtml =
            lastBreakIndex >= 0 ? html.slice(lastBreakIndex + 4) : html;
          const currentLineText = currentLineHtml
            .replace(/<[^>]+>/g, "")
            .replace(/\\u200B/g, "")
            .trim();

          return currentLineText.length === 0 && html.length > 0;
        };

        const applyMarkdownShortcut = (command, context) => {
          const shortcutRange = context.range.cloneRange();
          shortcutRange.selectNodeContents(context.block);
          shortcutRange.setEnd(context.range.endContainer, context.range.endOffset);
          shortcutRange.deleteContents();

          const replaceBlock = (nextBlock, caretNode, caretOffset = 0) => {
            context.block.replaceWith(nextBlock);
            setCaret(caretNode, caretOffset);
          };

          switch (command) {
            case "heading1": {
              const heading = document.createElement("h1");
              heading.appendChild(document.createElement("br"));
              replaceBlock(heading, heading, 0);
              break;
            }
            case "bulletList": {
              const list = document.createElement("ul");
              const item = document.createElement("li");
              item.appendChild(document.createElement("br"));
              list.appendChild(item);
              replaceBlock(list, item, 0);
              break;
            }
            case "blockquote": {
              const blockquote = document.createElement("blockquote");
              blockquote.appendChild(document.createElement("br"));
              replaceBlock(blockquote, blockquote, 0);
              break;
            }
            case "codeBlock": {
              const pre = document.createElement("pre");
              const code = document.createElement("code");
              const caretNode = document.createTextNode("");
              code.appendChild(caretNode);
              pre.appendChild(code);
              replaceBlock(pre, caretNode, 0);
              break;
            }
            default:
              return;
          }

          window.requestAnimationFrame(emitChange);
        };

        const runCommand = (command) => {
          focusEditor();
          switch (command) {
            case "bold":
              document.execCommand("bold");
              break;
            case "italic":
              document.execCommand("italic");
              break;
            case "heading1":
              toggleBlock("h1");
              break;
            case "heading2":
              toggleBlock("h2");
              break;
            case "bulletList":
              document.execCommand("insertUnorderedList");
              break;
            case "orderedList":
              document.execCommand("insertOrderedList");
              break;
            case "blockquote":
              toggleBlock("blockquote");
              break;
            case "clear":
              clearFormatting();
              break;
            default:
              break;
          }
          window.requestAnimationFrame(emitChange);
        };

        const setHtml = (html) => {
          applyingExternalUpdate = true;
          editor.innerHTML = html && html.trim() ? html : config.emptyHtml;
          updateEmptyState();
          lastSentHtml = editor.innerHTML;
          applyingExternalUpdate = false;
          reportHeight();
        };

        const handleEnter = (event) => {
          if (event.key !== "Enter") return;
          if (event.isComposing) return;
          const context = getCurrentBlockContext();
          if (!context) return;

          const parentElement =
            context.range.startContainer?.nodeType === Node.ELEMENT_NODE
              ? context.range.startContainer
              : context.range.startContainer?.parentElement;
          const headingBlock =
            context.block.tagName === "H1" || context.block.tagName === "H2"
              ? context.block
              : parentElement?.closest("h1, h2");
          if (headingBlock instanceof HTMLElement) {
            event.preventDefault();
            insertParagraphAfterBlock(headingBlock, context.range);
            window.requestAnimationFrame(emitChange);
            return;
          }

          const blockquote = parentElement?.closest("blockquote");
          if (blockquote instanceof HTMLElement) {
            event.preventDefault();
            if (isCurrentBlockquoteLineEmpty(blockquote, context.range)) {
              exitBlockquote(blockquote, context.range);
            } else {
              insertLineBreak();
            }
            window.requestAnimationFrame(emitChange);
            return;
          }

          const listItem = parentElement?.closest("li");
          if (!listItem) {
            event.preventDefault();
            insertLineBreak();
            window.requestAnimationFrame(emitChange);
            return;
          }

          if (listItem.textContent?.trim()) return;

          event.preventDefault();
          document.execCommand("outdent");
          formatBlock("p");
          window.requestAnimationFrame(emitChange);
          return;
        };

        const handleMarkdownShortcut = (event) => {
          if (event.inputType !== "insertText") return;
          if (event.data !== " ") return;
          if (event.isComposing) return;

          const context = getCurrentBlockContext();
          if (!context) return;

          const shortcutRange = context.range.cloneRange();
          shortcutRange.selectNodeContents(context.block);
          shortcutRange.setEnd(context.range.endContainer, context.range.endOffset);
          const command = getMarkdownShortcutCommand(
            shortcutRange.toString().replace(/\\u200B/g, ""),
          );
          if (!command) return;

          event.preventDefault();
          applyMarkdownShortcut(command, context);
        };

        const receiveHostMessage = (raw) => {
          try {
            const message =
              typeof raw === "string" ? JSON.parse(raw) : raw;
            if (message?.type === "set-html" && typeof message.html === "string") {
              setHtml(message.html);
            }
          } catch {
            // Ignore malformed host messages.
          }
        };

        window.__noteEditorHandleHostMessage = receiveHostMessage;
        window.addEventListener("message", (event) =>
          receiveHostMessage(event.data),
        );

        toolbar.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });

        toolbar.addEventListener("click", (event) => {
          const target = event.target.closest("[data-command]");
          if (!(target instanceof HTMLElement)) return;
          runCommand(target.dataset.command);
        });

        editor.addEventListener("keydown", handleEnter);
        editor.addEventListener("beforeinput", handleMarkdownShortcut);
        editor.addEventListener("input", () =>
          window.requestAnimationFrame(emitChange),
        );
        editor.addEventListener("paste", () =>
          window.setTimeout(emitChange, 0),
        );
        window.addEventListener("resize", reportHeight);

        document.execCommand("defaultParagraphSeparator", false, "p");
        ensureEditorHtml();
        postMessage({ type: "ready" });
        reportHeight();
      })();
    </script>
  </body>
</html>`;
}
