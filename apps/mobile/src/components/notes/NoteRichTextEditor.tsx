import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createNoteRichTextEditorDocument,
  markdownToNoteEditorHtml,
  markdownToNotePreviewText,
  noteEditorHtmlToMarkdown,
  parseNoteRichTextEditorMessage,
} from "@packages/frontend-shared/utils/noteRichText";
import { useTranslation } from "@packages/i18n";
import { useColorScheme } from "nativewind";
import { Text, TouchableOpacity, View } from "react-native";
import type { WebViewMessageEvent } from "react-native-webview";
import { WebView } from "react-native-webview";

import { mobileTestIds } from "../../testing/testIds";

type NoteRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

const E2E_SAMPLE_MARKDOWN = "# Morning plan\n\n- one\n- two\n\nafter list";

export function NoteRichTextEditor({
  value,
  onChange,
  placeholder,
}: NoteRichTextEditorProps) {
  const { t } = useTranslation("note");
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const isE2EMode = process.env.EXPO_PUBLIC_E2E_MODE === "1";
  const webViewRef = useRef<WebView>(null);
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
  const previewText = useMemo(() => markdownToNotePreviewText(value), [value]);

  const documentHtml = useMemo(
    () =>
      createNoteRichTextEditorDocument({
        placeholder,
        isDark,
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
      isDark,
      italicLabel,
      orderedListLabel,
      placeholder,
    ],
  );

  const sendHostMessage = useCallback(
    (message: { type: "set-html"; html: string }) => {
      const serialized = JSON.stringify(JSON.stringify(message));
      webViewRef.current?.injectJavaScript(
        `window.__noteEditorHandleHostMessage(${serialized}); true;`,
      );
    },
    [],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseNoteRichTextEditorMessage(event.nativeEvent.data);
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
    },
    [onChange, value],
  );

  useEffect(() => {
    if (!isReady) return;
    if (value === syncedMarkdownRef.current) return;

    sendHostMessage({
      type: "set-html",
      html: markdownToNoteEditorHtml(value),
    });
    syncedMarkdownRef.current = value;
  }, [isReady, sendHostMessage, value]);

  return (
    <View className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: documentHtml }}
        onMessage={handleMessage}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        style={{
          height,
          backgroundColor: "transparent",
        }}
        setSupportMultipleWindows={false}
      />
      {isE2EMode && (
        <View className="gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <TouchableOpacity
            onPress={() => onChange(E2E_SAMPLE_MARKDOWN)}
            className="rounded-lg bg-sky-600 px-3 py-2"
            accessibilityRole="button"
            accessibilityLabel="Fill sample note content"
            testID={mobileTestIds.notes.e2eFillSampleButton}
          >
            <Text className="text-center text-sm font-medium text-white">
              Fill sample note content
            </Text>
          </TouchableOpacity>
          <Text
            className="text-xs text-gray-500 dark:text-gray-400"
            testID={mobileTestIds.notes.e2ePreviewText}
          >
            {previewText}
          </Text>
        </View>
      )}
    </View>
  );
}
