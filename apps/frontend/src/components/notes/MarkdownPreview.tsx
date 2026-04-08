import { useTranslation } from "@packages/i18n";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export function MarkdownPreview({ content }: { content: string }) {
  const { t } = useTranslation("note");

  if (!content.trim()) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
        {t("preview.empty")}
      </p>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 break-words">
      <Markdown rehypePlugins={[rehypeSanitize]}>{content}</Markdown>
    </div>
  );
}
