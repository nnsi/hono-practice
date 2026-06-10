import { useState } from "react";

import { markdownToNotePreviewText } from "@packages/frontend-shared/utils/noteRichText";
import { useTranslation } from "@packages/i18n";
import {
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { mobileTestIds } from "../../testing/testIds";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { NoteActivityChips } from "./NoteActivityChips";
import { NoteBodyEditor } from "./NoteBodyEditor";
import { NoteDetailHeader } from "./NoteDetailHeader";
import { NoteNotFound } from "./NoteDetailStates";
import { NoteMarkdownView } from "./NoteMarkdownView";
import { useNoteDetailPage } from "./useNoteDetailPage";

const E2E_SAMPLE_MARKDOWN = "# Morning plan\n\n- one\n- two\n\nafter list";

export function NoteDetailPage() {
  const [editorEpoch, setEditorEpoch] = useState(0);
  const { t } = useTranslation("note");
  const insets = useSafeAreaInsets();
  const isE2EMode = process.env.EXPO_PUBLIC_E2E_MODE === "1";
  const {
    isNew,
    isLoading,
    notFound,
    title,
    setTitle,
    content,
    setContent,
    activityId,
    setActivityId,
    mode,
    saveState,
    activities,
    startEditing,
    handleBack,
  } = useNoteDetailPage();

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white dark:bg-gray-900"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-sm text-gray-400 dark:text-gray-500">
          {t("detail.loading")}
        </Text>
      </View>
    );
  }

  if (notFound) {
    return (
      <NoteNotFound onBack={() => void handleBack()} topInset={insets.top} />
    );
  }

  const fillSampleContent = () => {
    setContent(E2E_SAMPLE_MARKDOWN);
    setEditorEpoch((prev) => prev + 1);
  };

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-900"
      style={{ paddingTop: insets.top }}
      testID={mobileTestIds.notes.detailPage}
    >
      <NoteDetailHeader
        content={content}
        saveState={saveState}
        onBack={() => void handleBack()}
      />

      <ScrollView
        className="flex-1"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 96 + insets.bottom,
        }}
      >
        <IMESafeTextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t("create.placeholder.title")}
          placeholderTextColor="#9ca3af"
          className="text-xl font-semibold"
          style={{ fontSize: 20 }}
          accessibilityLabel={t("create.label.title")}
          testID={mobileTestIds.notes.titleInput}
        />

        <View className="mb-3">
          <NoteActivityChips
            activityId={activityId}
            onChangeActivityId={setActivityId}
            activities={activities}
          />
        </View>

        {mode === "edit" ? (
          <NoteBodyEditor
            key={editorEpoch}
            value={content}
            onChangeText={setContent}
            placeholder={t("create.placeholder.contentMobile")}
            autoFocus={isNew}
          />
        ) : (
          <Pressable
            onPress={startEditing}
            accessibilityRole="button"
            accessibilityLabel={t("detail.tapToEdit")}
            testID={mobileTestIds.notes.markdownView}
          >
            <NoteMarkdownView
              markdown={content}
              emptyLabel={t("detail.tapToEdit")}
            />
          </Pressable>
        )}

        {isE2EMode && (
          <View className="mt-6 gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
            <TouchableOpacity
              onPress={fillSampleContent}
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
              {markdownToNotePreviewText(content)}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
