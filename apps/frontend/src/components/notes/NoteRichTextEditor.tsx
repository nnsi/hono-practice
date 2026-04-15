import { useEffect, useMemo, useRef, useState } from "react";

import {
  createNoteRichTextEditorDocument,
  markdownToNoteEditorHtml,
  noteEditorHtmlToMarkdown,
  parseNoteRichTextEditorMessage,
} from "@packages/frontend-shared/utils/noteRichText";
import { useTranslation } from "@packages/i18n";

type NoteRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function NoteRichTextEditor({
  value,
  onChange,
  placeholder,
}: NoteRichTextEditorProps) {
  const { t } = useTranslation("note");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const syncedMarkdownRef = useRef("__uninitialized__");
  const [isReady, setIsReady] = useState(false);
  const [height, setHeight] = useState(360);

  const boldLabel = t("toolbar.bold");
  const italicLabel = t("toolbar.italic");
  const heading1Label = t("toolbar.heading1");
  const heading2Label = t("toolbar.heading2");
  const bulletListLabel = t("toolbar.bulletList");
  const orderedListLabel = t("toolbar.orderedList");
  const blockquoteLabel = t("toolbar.blockquote");
  const clearLabel = t("toolbar.clear");

  const documentHtml = useMemo(
    () =>
      createNoteRichTextEditorDocument({
        placeholder,
        labels: {
          bold: boldLabel,
          italic: italicLabel,
          heading1: heading1Label,
          heading2: heading2Label,
          bulletList: bulletListLabel,
          orderedList: orderedListLabel,
          blockquote: blockquoteLabel,
          clear: clearLabel,
        },
      }),
    [
      blockquoteLabel,
      boldLabel,
      bulletListLabel,
      clearLabel,
      heading1Label,
      heading2Label,
      italicLabel,
      orderedListLabel,
      placeholder,
    ],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      const message = parseNoteRichTextEditorMessage(event.data);
      if (!message) return;

      if (message.type === "ready") {
        setIsReady(true);
        return;
      }

      if (message.type === "height") {
        setHeight(Math.max(360, Math.ceil(message.height)));
        return;
      }

      const nextMarkdown = noteEditorHtmlToMarkdown(message.html);
      syncedMarkdownRef.current = nextMarkdown;
      if (nextMarkdown !== value) {
        onChange(nextMarkdown);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onChange, value]);

  useEffect(() => {
    if (!isReady) return;
    if (value === syncedMarkdownRef.current) return;

    const serializedMessage = JSON.stringify({
      type: "set-html",
      html: markdownToNoteEditorHtml(value),
    });

    iframeRef.current?.contentWindow?.postMessage(serializedMessage, "*");
    syncedMarkdownRef.current = value;
  }, [isReady, value]);

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <iframe
        ref={iframeRef}
        srcDoc={documentHtml}
        title={t("create.label.content")}
        sandbox="allow-scripts"
        className="block w-full border-0 bg-transparent"
        style={{ height }}
      />
    </div>
  );
}
