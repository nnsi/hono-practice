import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

/** Notes are GFM Markdown; ordinary prose newlines are visible on both clients. */
export const noteMarkdownProcessor = unified().use(remarkParse).use(remarkGfm);

export function parseNoteMarkdown(markdown: string) {
  return noteMarkdownProcessor.parse(markdown);
}
