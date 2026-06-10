import { useMemo } from "react";

import {
  type NoteInlineSpan,
  type NoteMarkdownBlock,
  parseNoteMarkdownBlocks,
} from "@packages/frontend-shared/utils/noteMarkdownBlocks";
import { Text, View } from "react-native";

type NoteMarkdownViewProps = {
  markdown: string;
  emptyLabel: string;
};

function InlineSpans({ spans }: { spans: NoteInlineSpan[] }) {
  return (
    <>
      {spans.map((span, index) => (
        <Text
          // biome-ignore lint/suspicious/noArrayIndexKey: 静的なspan列で並び替えは発生しない
          key={index}
          className={`${span.bold ? "font-bold" : ""} ${
            span.italic ? "italic" : ""
          } ${
            span.code
              ? "bg-gray-100 dark:bg-gray-800 rounded px-1 font-mono text-[14px]"
              : ""
          }`}
        >
          {span.text}
        </Text>
      ))}
    </>
  );
}

function ListRow({
  marker,
  spans,
}: {
  marker: string;
  spans: NoteInlineSpan[];
}) {
  return (
    <View className="flex-row pl-1 my-0.5">
      <Text className="text-base leading-6 text-gray-500 dark:text-gray-400 w-6">
        {marker}
      </Text>
      <Text className="flex-1 text-base leading-6 text-gray-900 dark:text-gray-100">
        <InlineSpans spans={spans} />
      </Text>
    </View>
  );
}

function MarkdownBlock({ block }: { block: NoteMarkdownBlock }) {
  switch (block.type) {
    case "heading1":
      return (
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1">
          <InlineSpans spans={block.spans} />
        </Text>
      );
    case "heading2":
      return (
        <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-2 mb-1">
          <InlineSpans spans={block.spans} />
        </Text>
      );
    case "blockquote":
      return (
        <View className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 my-1">
          <Text className="text-base leading-6 text-gray-600 dark:text-gray-400 italic">
            <InlineSpans spans={block.spans} />
          </Text>
        </View>
      );
    case "bullet":
      return <ListRow marker="•" spans={block.spans} />;
    case "ordered":
      return <ListRow marker={`${block.number}.`} spans={block.spans} />;
    default:
      return (
        <Text className="text-base leading-6 text-gray-900 dark:text-gray-100 my-0.5">
          <InlineSpans spans={block.spans} />
        </Text>
      );
  }
}

export function NoteMarkdownView({
  markdown,
  emptyLabel,
}: NoteMarkdownViewProps) {
  const blocks = useMemo(() => parseNoteMarkdownBlocks(markdown), [markdown]);

  if (blocks.length === 0) {
    return (
      <Text className="text-base text-gray-400 dark:text-gray-500 py-2">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <View>
      {blocks.map((block, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 表示専用で並び替えは発生しない
        <MarkdownBlock key={index} block={block} />
      ))}
    </View>
  );
}
